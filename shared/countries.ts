/**
 * 국가 목록. 온보딩 마지막 단계·설정·휴대폰 인증 국가번호 기본값에 쓴다.
 * 더 넣으려면 배열에 추가하고, 앱 번역 카탈로그의 countries.<코드> 에 이름을 넣는다 (ISO 3166-1 alpha-2).
 */

export interface Country {
  code: string;
  /** 국제 전화 국가번호 (+ 없이) */
  dial: string;
  flag: string;
}

export const COUNTRIES: readonly Country[] = [
  { code: 'KR', dial: '82', flag: '🇰🇷' },
  { code: 'JP', dial: '81', flag: '🇯🇵' },
  { code: 'US', dial: '1', flag: '🇺🇸' },
  { code: 'CA', dial: '1', flag: '🇨🇦' },
  { code: 'GB', dial: '44', flag: '🇬🇧' },
  { code: 'AU', dial: '61', flag: '🇦🇺' },
  { code: 'NZ', dial: '64', flag: '🇳🇿' },
  { code: 'CN', dial: '86', flag: '🇨🇳' },
  { code: 'TW', dial: '886', flag: '🇹🇼' },
  { code: 'HK', dial: '852', flag: '🇭🇰' },
  { code: 'SG', dial: '65', flag: '🇸🇬' },
  { code: 'VN', dial: '84', flag: '🇻🇳' },
  { code: 'TH', dial: '66', flag: '🇹🇭' },
  { code: 'PH', dial: '63', flag: '🇵🇭' },
  { code: 'MY', dial: '60', flag: '🇲🇾' },
  { code: 'ID', dial: '62', flag: '🇮🇩' },
  { code: 'IN', dial: '91', flag: '🇮🇳' },
  { code: 'DE', dial: '49', flag: '🇩🇪' },
  { code: 'FR', dial: '33', flag: '🇫🇷' },
  { code: 'ES', dial: '34', flag: '🇪🇸' },
  { code: 'IT', dial: '39', flag: '🇮🇹' },
  { code: 'NL', dial: '31', flag: '🇳🇱' },
  { code: 'SE', dial: '46', flag: '🇸🇪' },
  { code: 'CH', dial: '41', flag: '🇨🇭' },
  { code: 'PL', dial: '48', flag: '🇵🇱' },
  { code: 'PT', dial: '351', flag: '🇵🇹' },
  { code: 'IE', dial: '353', flag: '🇮🇪' },
  { code: 'TR', dial: '90', flag: '🇹🇷' },
  { code: 'AE', dial: '971', flag: '🇦🇪' },
  { code: 'BR', dial: '55', flag: '🇧🇷' },
  { code: 'MX', dial: '52', flag: '🇲🇽' },
  { code: 'AR', dial: '54', flag: '🇦🇷' },
  { code: 'CL', dial: '56', flag: '🇨🇱' },
  { code: 'ZA', dial: '27', flag: '🇿🇦' },
];

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

export const DEFAULT_COUNTRY = 'KR';

export function isCountryCode(code: unknown): code is string {
  return typeof code === 'string' && BY_CODE.has(code.toUpperCase());
}

export function findCountry(code: string | undefined | null): Country | undefined {
  return code ? BY_CODE.get(code.toUpperCase()) : undefined;
}

/** 시스템 로케일의 지역 코드 → 목록에 있는 국가. 없으면 기본값 */
export function countryFromLocale(regionCode: string | null | undefined): string {
  return regionCode && BY_CODE.has(regionCode.toUpperCase()) ? regionCode.toUpperCase() : DEFAULT_COUNTRY;
}

/**
 * 국내 형식 번호를 E.164 로. 한국의 맨 앞 0 처럼 국내용 트렁크 0 을 뗀다.
 * 이미 +로 시작하면 숫자만 남겨 그대로 쓴다.
 */
export function toE164(raw: string, countryCode: string): string | null {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;
  if (trimmed.startsWith('+')) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  const country = findCountry(countryCode);
  if (!country) return null;
  const national = digits.replace(/^0+/, '');
  const full = `${country.dial}${national}`;
  return full.length >= 8 && full.length <= 15 ? `+${full}` : null;
}
