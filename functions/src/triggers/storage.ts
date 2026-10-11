/**
 * 업로드된 사진 후처리: 방향 보정 → EXIF(GPS 포함) 제거 → 최대 1600px 로 줄여 JPEG 로 다시 저장.
 *
 * 처리한 파일에는 metadata.processed = 'true' 를 붙여 다시 트리거되지 않게 한다.
 * 사진이 아닌 파일·너무 큰 파일은 지운다 (Storage Rules 를 우회한 경우 대비).
 */

import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { logger } from 'firebase-functions/v2';
import sharp from 'sharp';

import { LIMITS } from '../../../shared/validators';
import { bucket } from '../lib/admin';

const MAX_EDGE = 1600;

/** 모더레이션 훅. 지금은 전부 통과. 나중에 Vision SafeSearch 같은 것을 붙인다. */
export async function moderateImage(_image: Buffer, _path: string): Promise<'ok' | 'reject'> {
  return 'ok';
}

const ALLOWED_PREFIX = /^(users\/[^/]+\/profile|posts\/[^/]+|chat\/[^/]+\/[^/]+)\//;

export const onImageUploaded = onObjectFinalized({ memory: '1GiB', region: 'asia-northeast3' }, async (event) => {
  const obj = event.data;
  const path = obj.name;
  if (!path || !ALLOWED_PREFIX.test(path)) return;
  if (obj.metadata?.processed === 'true') return;

  const file = bucket().file(path);
  const size = Number(obj.size ?? 0);
  if (!obj.contentType?.startsWith('image/') || size > LIMITS.UPLOAD_MAX_BYTES * 2) {
    logger.warn('허용되지 않는 업로드 삭제', { path, contentType: obj.contentType, size });
    await file.delete({ ignoreNotFound: true });
    return;
  }

  const [original] = await file.download();
  let output: Buffer;
  try {
    output = await sharp(original)
      .rotate()
      .resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } catch (e) {
    logger.warn('이미지 디코딩 실패, 삭제', { path, error: String(e) });
    await file.delete({ ignoreNotFound: true });
    return;
  }

  if ((await moderateImage(output, path)) === 'reject') {
    await file.delete({ ignoreNotFound: true });
    return;
  }

  // 다운로드 토큰을 그대로 옮겨야 앱이 이미 받은 URL 이 깨지지 않는다
  const token = obj.metadata?.firebaseStorageDownloadTokens;
  await file.save(output, {
    contentType: 'image/jpeg',
    metadata: {
      metadata: { processed: 'true', ...(token ? { firebaseStorageDownloadTokens: token } : {}) },
      cacheControl: 'private, max-age=31536000',
    },
    resumable: false,
  });
});
