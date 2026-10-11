/**
 * 온보딩 데이터 형식과 검증.
 *
 * 화면 순서·게이지는 앱의 `src/features/onboarding/steps.ts` 가 정하고,
 * 여기는 "어떤 값이 유효한가" 만 정한다. 서버 `completeOnboarding` 이 같은 함수로 다시 검사한다.
 * 선택지의 화면 이름(남성/Male 등)은 앱 번역 카탈로그 `options.*` 에 있다.
 */

import { isCountryCode } from './countries';
import { checkNickname, checkShortField, LIMITS, type Issue } from './validators';

export const GENDERS = ['male', 'female', 'other'] as const;
export type Gender = (typeof GENDERS)[number];

export const MBTIS = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
] as const;
export type Mbti = (typeof MBTIS)[number];

export const DRINKING = ['never', 'sometimes', 'often'] as const;
export type Drinking = (typeof DRINKING)[number];

export const SMOKING = ['never', 'sometimes', 'often'] as const;
export type Smoking = (typeof SMOKING)[number];

export const MIN_AGE = 18;
export const MAX_AGE = 99;

/** 온보딩 중 앱이 모으는 값. 서버로 그대로 보낸다. */
export interface OnboardingDraft {
  nickname?: string;
  /** 'YYYY-MM-DD' */
  birthDate?: string;
  gender?: Gender;
  /** Storage 경로 (users/{uid}/profile/...) */
  photos?: string[];
  mbti?: Mbti | null;
  drinking?: Drinking | null;
  smoking?: Smoking | null;
  job?: string;
  school?: string;
  countryCode?: string;
}

export type DraftField = keyof OnboardingDraft;
export type FieldErrors = Partial<Record<DraftField, Issue>>;

/** 만 나이 */
export function ageFrom(birthDate: string, nowMs: number): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const birth = new Date(Date.UTC(y, mo - 1, d));
  if (birth.getUTCFullYear() !== y || birth.getUTCMonth() !== mo - 1 || birth.getUTCDate() !== d) return null;
  const now = new Date(nowMs);
  let age = now.getUTCFullYear() - y;
  if (now.getUTCMonth() < mo - 1 || (now.getUTCMonth() === mo - 1 && now.getUTCDate() < d)) age--;
  return age;
}

function oneOf<T extends string>(list: readonly T[], v: unknown): v is T {
  return typeof v === 'string' && (list as readonly string[]).includes(v);
}

/** 사진 경로가 본인 프로필 폴더 안인가 */
export function isOwnProfilePhotoPath(uid: string, path: unknown): path is string {
  return (
    typeof path === 'string' &&
    path.startsWith(`users/${uid}/profile/`) &&
    !path.includes('..') &&
    /^[\w/.-]+$/.test(path)
  );
}

type FieldValidator = (draft: OnboardingDraft, ctx: { uid: string; nowMs: number }) => Issue | null;

const choice = <T extends string>(field: DraftField, list: readonly T[]) =>
  ((d) => {
    const v = d[field];
    return v == null || oneOf(list, v) ? null : { field, code: 'invalidChoice' };
  }) satisfies FieldValidator as FieldValidator;

export const FIELD_VALIDATORS: Record<DraftField, FieldValidator> = {
  nickname: (d) => {
    const r = checkNickname(d.nickname);
    return r.ok ? null : r.issue;
  },
  birthDate: (d, { nowMs }) => {
    if (!d.birthDate) return { field: 'birthDate', code: 'required' };
    const age = ageFrom(d.birthDate, nowMs);
    if (age === null) return { field: 'birthDate', code: 'invalidFormat' };
    if (age < MIN_AGE) return { field: 'birthDate', code: 'underage', limit: MIN_AGE };
    if (age > MAX_AGE) return { field: 'birthDate', code: 'tooOld' };
    return null;
  },
  gender: (d) => (oneOf(GENDERS, d.gender) ? null : { field: 'gender', code: 'required' }),
  photos: (d, { uid }) => {
    const photos = d.photos ?? [];
    if (photos.length < LIMITS.PROFILE_PHOTOS_MIN) return { field: 'photos', code: 'tooFew', limit: LIMITS.PROFILE_PHOTOS_MIN };
    if (photos.length > LIMITS.PROFILE_PHOTOS_MAX) return { field: 'photos', code: 'tooMany', limit: LIMITS.PROFILE_PHOTOS_MAX };
    if (!photos.every((p) => isOwnProfilePhotoPath(uid, p))) return { field: 'photos', code: 'invalidPath' };
    return null;
  },
  mbti: choice('mbti', MBTIS),
  drinking: choice('drinking', DRINKING),
  smoking: choice('smoking', SMOKING),
  job: (d) => {
    const r = checkShortField(d.job, 'job', LIMITS.JOB_MAX);
    return r.ok ? null : r.issue;
  },
  school: (d) => {
    const r = checkShortField(d.school, 'school', LIMITS.SCHOOL_MAX);
    return r.ok ? null : r.issue;
  },
  countryCode: (d) => (isCountryCode(d.countryCode) ? null : { field: 'countryCode', code: 'required' }),
};

/** 일부 필드만 검사 (온보딩 단계별 다음 버튼) */
export function validateFields(
  draft: OnboardingDraft,
  fields: readonly DraftField[],
  ctx: { uid: string; nowMs: number },
): FieldErrors {
  const errors: FieldErrors = {};
  for (const f of fields) {
    const e = FIELD_VALIDATORS[f](draft, ctx);
    if (e) errors[f] = e;
  }
  return errors;
}

export const ALL_FIELDS = Object.keys(FIELD_VALIDATORS) as DraftField[];

type CleanDraft = Required<Omit<OnboardingDraft, 'mbti' | 'drinking' | 'smoking'>> &
  Pick<OnboardingDraft, 'mbti' | 'drinking' | 'smoking'>;

/** 서버가 최종 제출을 받을 때. 오류가 없으면 정리된 값을 돌려준다. */
export function validateDraft(
  draft: OnboardingDraft,
  ctx: { uid: string; nowMs: number },
): { ok: true; value: CleanDraft } | { ok: false; errors: FieldErrors } {
  const errors = validateFields(draft, ALL_FIELDS, ctx);
  if (Object.keys(errors).length) return { ok: false, errors };
  const nick = checkNickname(draft.nickname);
  const job = checkShortField(draft.job, 'job', LIMITS.JOB_MAX);
  const school = checkShortField(draft.school, 'school', LIMITS.SCHOOL_MAX);
  return {
    ok: true,
    value: {
      nickname: nick.ok ? nick.value : '',
      birthDate: draft.birthDate!,
      gender: draft.gender!,
      photos: [...draft.photos!],
      mbti: draft.mbti ?? null,
      drinking: draft.drinking ?? null,
      smoking: draft.smoking ?? null,
      job: job.ok ? job.value : '',
      school: school.ok ? school.value : '',
      countryCode: draft.countryCode!.toUpperCase(),
    },
  };
}

/** 선택 항목까지 전부 채웠는가 (프로필 완성 보상) */
export function isProfileComplete(d: OnboardingDraft): boolean {
  return Boolean(d.mbti && d.drinking && d.smoking && d.job && d.school && (d.photos?.length ?? 0) >= 3);
}
