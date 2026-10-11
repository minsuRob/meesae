/**
 * 사용자가 쓰는 글의 길이·형식 규칙. 앱 입력창과 Functions 검증이 같은 숫자를 쓴다.
 */

export const LIMITS = {
  NICKNAME_MIN: 2,
  NICKNAME_MAX: 12,
  JOB_MAX: 30,
  SCHOOL_MAX: 30,
  MESSAGE_MAX: 1000,
  POST_MAX: 2000,
  POST_IMAGES_MAX: 4,
  COMMENT_MAX: 500,
  REPORT_REASON_MAX: 500,
  PROFILE_PHOTOS_MIN: 1,
  PROFILE_PHOTOS_MAX: 6,
  UPLOAD_MAX_BYTES: 5 * 1024 * 1024,
} as const;

/** 앞뒤 공백 제거 + 제어 문자 제거 + 3줄 넘는 빈 줄 접기 */
export function cleanText(input: string): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** 검사할 수 있는 필드. 앱은 필드·코드로 문구를 고른다 (shared 는 문장을 만들지 않는다) */
export type Field =
  | 'nickname'
  | 'birthDate'
  | 'gender'
  | 'photos'
  | 'mbti'
  | 'drinking'
  | 'smoking'
  | 'job'
  | 'school'
  | 'countryCode'
  | 'message'
  | 'post'
  | 'comment';

export type IssueCode =
  | 'required'
  | 'tooShort'
  | 'tooLong'
  | 'invalidChars'
  | 'containsContact'
  | 'invalidFormat'
  | 'underage'
  | 'tooOld'
  | 'tooFew'
  | 'tooMany'
  | 'invalidPath'
  | 'invalidChoice';

/** 검증 실패 하나. limit 는 글자 수·장 수·나이 같은 기준값 */
export interface Issue {
  field: Field;
  code: IssueCode;
  limit?: number;
}

export type TextCheck = { ok: true; value: string } | { ok: false; issue: Issue };

/** 서버 로그·HttpsError 메시지용 영어 요약. 사용자 문구는 앱이 번역한다 */
export function issueSummary(i: Issue): string {
  return `${i.field}: ${i.code}${i.limit != null ? ` (${i.limit})` : ''}`;
}

function lengthCheck(raw: unknown, min: number, max: number, field: Field): TextCheck {
  if (typeof raw !== 'string') return { ok: false, issue: { field, code: 'required' } };
  const value = cleanText(raw);
  const len = [...value].length;
  if (len < min) {
    return { ok: false, issue: min <= 1 ? { field, code: 'required' } : { field, code: 'tooShort', limit: min } };
  }
  if (len > max) return { ok: false, issue: { field, code: 'tooLong', limit: max } };
  return { ok: true, value };
}

const NICKNAME_RE = /^[\p{L}\p{N}_.]+$/u;

export function checkNickname(raw: unknown): TextCheck {
  const r = lengthCheck(raw, LIMITS.NICKNAME_MIN, LIMITS.NICKNAME_MAX, 'nickname');
  if (!r.ok) return r;
  if (!NICKNAME_RE.test(r.value)) return { ok: false, issue: { field: 'nickname', code: 'invalidChars' } };
  if (containsContact(r.value)) return { ok: false, issue: { field: 'nickname', code: 'containsContact' } };
  return r;
}

export function checkMessage(raw: unknown): TextCheck {
  return lengthCheck(raw, 1, LIMITS.MESSAGE_MAX, 'message');
}

export function checkPost(raw: unknown): TextCheck {
  const r = lengthCheck(raw, 1, LIMITS.POST_MAX, 'post');
  if (r.ok && containsContact(r.value)) return { ok: false, issue: { field: 'post', code: 'containsContact' } };
  return r;
}

export function checkComment(raw: unknown): TextCheck {
  const r = lengthCheck(raw, 1, LIMITS.COMMENT_MAX, 'comment');
  if (r.ok && containsContact(r.value)) return { ok: false, issue: { field: 'comment', code: 'containsContact' } };
  return r;
}

export function checkShortField(raw: unknown, field: Field, max: number): TextCheck {
  if (raw === undefined || raw === null || raw === '') return { ok: true, value: '' };
  return lengthCheck(raw, 0, max, field);
}

/**
 * 전화번호·메신저 ID·URL 처럼 보이는 문자열. 프로필 공개 필드와 게시물에서는 막고,
 * 1:1 대화에서는 막지 않는다 (서로 동의한 사이에서는 자유롭게 교환).
 */
const CONTACT_PATTERNS: RegExp[] = [
  /(?:\+?\d[\s-]?){9,}/, // 전화번호
  /(?<![A-Za-z])(?:kakao|카톡|카카오톡|line|라인|telegram|텔레그램|insta|인스타)\s*(?:id|아이디)?\s*[:：]?\s*[\w.]{3,}/i,
  /https?:\/\/|www\./i,
];

export function containsContact(text: string): boolean {
  return CONTACT_PATTERNS.some((re) => re.test(text));
}

/** 업로드 파일이 허용 형식인가 (Storage Rules 와 같은 조건) */
export function isAllowedUpload(contentType: string, size: number): boolean {
  return /^image\//.test(contentType) && size > 0 && size <= LIMITS.UPLOAD_MAX_BYTES;
}

/** 멱등키 형식 (클라이언트가 만든 무작위 문자열) */
export function isRequestId(v: unknown): v is string {
  return typeof v === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(v);
}
