/**
 * 사진 업로드·다운로드 URL.
 * 올린 뒤 서버 트리거(onImageUploaded)가 EXIF 를 지우고 1600px JPEG 로 다시 저장한다.
 */

import * as ImagePicker from 'expo-image-picker';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useEffect, useState } from 'react';

import { LIMITS } from '@shared/validators';

import { appFail, newRequestId } from './api';
import { storage } from './config';

export async function pickImage(): Promise<ImagePicker.ImagePickerAsset | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw appFail('errors.photoPermission');
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: true,
    exif: false,
  });
  return res.canceled ? null : (res.assets[0] ?? null);
}

/** folder 예: `users/{uid}/profile` → 반환값은 Storage 경로 */
export async function uploadImage(localUri: string, folder: string): Promise<string> {
  const blob = await (await fetch(localUri)).blob();
  if (blob.size > LIMITS.UPLOAD_MAX_BYTES) throw appFail('errors.uploadTooBig');
  const contentType = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
  const path = `${folder}/${newRequestId()}.jpg`;
  await uploadBytes(ref(storage(), path), blob, { contentType });
  return path;
}

const urlCache = new Map<string, string>();

export async function storageUrl(path: string): Promise<string> {
  const hit = urlCache.get(path);
  if (hit) return hit;
  const url = await getDownloadURL(ref(storage(), path));
  urlCache.set(path, url);
  return url;
}

/** Storage 경로 → 표시용 URL. 경로가 http 면 그대로 쓴다 */
export function useStorageUrl(path: string | null | undefined): string | null {
  const [resolved, setResolved] = useState<{ path: string; url: string | null } | null>(null);
  const direct = !path || path.startsWith('http') || urlCache.has(path);
  useEffect(() => {
    if (!path || direct) return;
    let alive = true;
    storageUrl(path).then(
      (url) => alive && setResolved({ path, url }),
      () => alive && setResolved({ path, url: null }),
    );
    return () => {
      alive = false;
    };
  }, [path, direct]);
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return urlCache.get(path) ?? (resolved?.path === path ? resolved.url : null);
}
