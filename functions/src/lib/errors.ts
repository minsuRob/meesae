import { HttpsError, type FunctionsErrorCode } from 'firebase-functions/v2/https';

import { APP_ERRORS, type AppErrorCode } from '../../../shared/api';
import { issueSummary, type Issue } from '../../../shared/validators';

const STATUS: Record<AppErrorCode, FunctionsErrorCode> = {
  INSUFFICIENT_POINTS: 'failed-precondition',
  NO_SUPER_LIKE: 'failed-precondition',
  PHONE_REQUIRED: 'permission-denied',
  NOT_ONBOARDED: 'permission-denied',
  BANNED: 'permission-denied',
  BLOCKED: 'permission-denied',
  RATE_LIMITED: 'resource-exhausted',
  ALREADY_LIKED: 'already-exists',
  NOT_FOUND: 'not-found',
  INVALID: 'invalid-argument',
  PHOTO_MISSING: 'failed-precondition',
  LOCATION_UNKNOWN: 'unavailable',
  PHONE_IN_USE: 'already-exists',
  NO_PHONE: 'failed-precondition',
  CONVERSATION_CLOSED: 'failed-precondition',
  SHARE_ENDED: 'failed-precondition',
  PERK_REQUIRED: 'failed-precondition',
};

/**
 * 앱이 `details.code` 로 분기하고 번역하는 오류. 메시지는 로그용 영어다
 * (사용자 문구는 앱 카탈로그 errors.<CODE> · validation.* 가 정한다).
 */
export function appError(code: AppErrorCode, extra?: Record<string, unknown>): HttpsError {
  return new HttpsError(STATUS[code], APP_ERRORS[code], { code, ...extra });
}

/** 입력 검증 실패. 앱은 issue 로 필드별 문구를 만든다 */
export function invalid(issue?: Issue, note?: string): HttpsError {
  return new HttpsError('invalid-argument', issue ? issueSummary(issue) : (note ?? APP_ERRORS.INVALID), {
    code: 'INVALID',
    ...(issue ? { issue } : {}),
  });
}
