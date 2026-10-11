/**
 * 지원 언어 목록. 앱 번역 카탈로그(src/i18n/locales)와 서버 역지오코딩(지역 이름)이 같이 본다.
 * 새 언어: 여기에 코드를 추가 → src/i18n/locales/<code>.ts 작성 → src/i18n/index.ts 에 등록.
 */

export const LOCALES = ['ko', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** 지원하지 않는 언어의 기기에서 쓰는 언어 */
export const FALLBACK_LOCALE: Locale = 'en';

export function isLocale(v: unknown): v is Locale {
  return typeof v === 'string' && (LOCALES as readonly string[]).includes(v);
}

/** 'ko-KR' · 'ko' → 'ko', 모르는 언어면 null */
export function matchLocale(tag: string | null | undefined): Locale | null {
  if (!tag) return null;
  const base = tag.toLowerCase().split(/[-_]/)[0];
  return isLocale(base) ? base : null;
}

/** 언어별 이름 묶음. 없으면 기본값을 쓴다 */
export type Localized = Partial<Record<Locale, string>>;

export function pickLocalized(map: Localized | null | undefined, locale: Locale, fallback: string | null = null): string | null {
  return map?.[locale] ?? fallback;
}
