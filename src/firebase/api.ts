/**
 * Callable Functions 호출. 이름·요청·응답 타입은 shared/api.ts 가 정한다.
 *
 *   const res = await call('likeUser', { targetUid, clientRequestId: newRequestId() });
 */

import { randomUUID } from 'expo-crypto';
import { FirebaseError } from 'firebase/app';
import { httpsCallable } from 'firebase/functions';

import { APP_ERRORS, type ApiName, type ApiReq, type ApiRes, type AppErrorCode } from '@shared/api';
import type { Issue } from '@shared/validators';

import { issueMessage, translate, type MessageKey } from '@/i18n';

import { functions } from './config';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: AppErrorCode | null,
    readonly details: Record<string, unknown>,
  ) {
    super(message);
  }
}

export async function call<N extends ApiName>(name: N, req: ApiReq<N>): Promise<ApiRes<N>> {
  try {
    const fn = httpsCallable<ApiReq<N>, ApiRes<N>>(functions(), name);
    const res = await fn(req);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}

/**
 * 어떤 오류든 사용자 언어의 문구를 가진 ApiError 로 바꾼다.
 * 서버는 코드(details.code)와 검증 이슈(details.issue)만 보내고, 문장은 여기서 고른다.
 */
export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  if (e instanceof FirebaseError) {
    const details = ((e as FirebaseError & { details?: unknown }).details ?? {}) as Record<string, unknown>;
    const code = typeof details.code === 'string' && details.code in APP_ERRORS ? (details.code as AppErrorCode) : null;
    if (code === 'INVALID' && details.issue) return new ApiError(issueMessage(details.issue as Issue), code, details);
    if (code) return new ApiError(translate(`errors.${code}`), code, details);
    return new ApiError(firebaseMessage(e), null, details);
  }
  if (e instanceof Error && e.message.startsWith('errors.')) return new ApiError(translate(e.message as MessageKey), null, {});
  return new ApiError(translate('errors.unknown'), null, {});
}

/** Firebase SDK 자체 오류 코드 → 문구 */
function firebaseMessage(e: FirebaseError): string {
  const c = e.code;
  if (c.includes('ACCOUNT_RESTRICTED') || e.message.includes('ACCOUNT_RESTRICTED')) return translate('errors.BANNED');
  if (c === 'auth/invalid-verification-code' || c === 'auth/code-expired') return translate('errors.phoneCodeWrong');
  if (c === 'auth/too-many-requests') return translate('errors.phoneTooMany');
  if (c === 'auth/invalid-phone-number' || c === 'auth/missing-phone-number') return translate('errors.phoneInvalid');
  if (c === 'auth/credential-already-in-use' || c === 'auth/provider-already-linked') return translate('errors.PHONE_IN_USE');
  if (c === 'auth/network-request-failed') return translate('errors.network');
  if (c.endsWith('unauthenticated')) return translate('errors.signInAgain');
  if (c.endsWith('unavailable') || c.endsWith('deadline-exceeded')) return translate('errors.network');
  if (c.endsWith('resource-exhausted')) return translate('errors.RATE_LIMITED');
  return translate('errors.unknown');
}

/** 컴포넌트 밖에서 사용자에게 보일 오류를 던질 때: throw appFail('errors.uploadTooBig') */
export function appFail(key: MessageKey): Error {
  return new Error(key);
}

/** 멱등키. 같은 행동을 재시도할 때는 같은 값을 다시 보낸다. */
export function newRequestId(): string {
  return randomUUID().replace(/-/g, '');
}
