/**
 * 역지오코딩. 좌표 → 국가·시도·구 + 지원 언어별 지역 이름.
 *
 * regionKey 는 현지 이름(언어 지정 없이 받은 값)으로 만들어 언어와 상관없이 같다.
 * 화면에 보일 이름은 shared/i18n 의 LOCALES 마다 따로 받아 labels 에 둔다.
 *
 * provider 를 갈아끼울 수 있게 인터페이스로 둔다 (GEOCODER 환경 변수).
 *   - nominatim (기본): OpenStreetMap. 키 불필요, 초당 1회 정책 → 결과를 geohash 6자리로 캐시
 *   - google: Google Geocoding. 비밀값 GOOGLE_GEOCODING_KEY 필요
 *   - fake: 테스트용. 네트워크 없이 좌표로 가짜 구 이름을 만든다
 */

import { COL } from '../../../shared/models';
import { LOCALES, type Locale, type Localized } from '../../../shared/i18n';
import { geohashEncode, regionLabelOf, type LatLng, type RegionParts } from '../../../shared/region';
import { db } from './admin';

export interface Geocoder {
  /** lang 이 없으면 현지 이름 */
  reverse(p: LatLng, lang?: Locale): Promise<RegionParts | null>;
  /** 외부 API 호출 사이 최소 간격(ms). Nominatim 은 초당 1회 정책 */
  minIntervalMs?: number;
}

export interface GeoResult {
  parts: RegionParts;
  labels: Localized;
}

const UA = 'meesae/0.1 (https://github.com/minsuRob/meesae)';

const nominatim: Geocoder = {
  minIntervalMs: 1100,
  async reverse({ lat, lng }, lang) {
    const email = process.env.NOMINATIM_EMAIL ? `&email=${encodeURIComponent(process.env.NOMINATIM_EMAIL)}` : '';
    const language = lang ? `&accept-language=${lang}` : '';
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1${language}${email}`;
    // 언어를 안 정하면 현지 이름이 오도록 Accept-Language 헤더도 보내지 않는다
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    const body = (await res.json()) as { address?: Record<string, string> };
    const a = body.address;
    if (!a?.country_code) return null;
    return {
      countryCode: a.country_code.toUpperCase(),
      admin1: a.state ?? a.province ?? a.region ?? a.city,
      // 서울 성북구 = borough, 일본 区 = city_district, 미국 = county
      admin2: a.borough ?? a.city_district ?? a.county ?? a.district,
      locality: a.city ?? a.town ?? a.village ?? a.municipality,
    };
  },
};

const google: Geocoder = {
  async reverse({ lat, lng }, lang) {
    const key = process.env.GOOGLE_GEOCODING_KEY;
    if (!key) throw new Error('GOOGLE_GEOCODING_KEY 가 없다');
    const language = lang ? `&language=${lang}` : '';
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}${language}&result_type=sublocality_level_1|administrative_area_level_2|locality&key=${key}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const body = (await res.json()) as {
      results?: { address_components: { long_name: string; short_name: string; types: string[] }[] }[];
    };
    const comps = body.results?.[0]?.address_components ?? [];
    const pick = (t: string, short = false) => {
      const c = comps.find((x) => x.types.includes(t));
      return c ? (short ? c.short_name : c.long_name) : undefined;
    };
    const country = pick('country', true);
    if (!country) return null;
    return {
      countryCode: country,
      admin1: pick('administrative_area_level_1'),
      admin2: pick('sublocality_level_1') ?? pick('administrative_area_level_2'),
      locality: pick('locality'),
    };
  },
};

/**
 * 테스트용. 한국 범위면 KR, 아니면 US. 0.1도 격자마다 다른 구 이름.
 * 같은 격자 → 같은 구, 0.5도 격자 → 같은 시도. 영어 요청이면 영어 이름.
 */
export const fakeGeocoder: Geocoder = {
  async reverse({ lat, lng }, lang) {
    const inKorea = lat > 33 && lat < 39 && lng > 124 && lng < 132;
    const a1 = `${Math.floor(lat * 2) / 2},${Math.floor(lng * 2) / 2}`;
    const a2 = `${Math.floor(lat * 10) / 10},${Math.floor(lng * 10) / 10}`;
    const en = lang === 'en' || (!lang && !inKorea);
    return {
      countryCode: inKorea ? 'KR' : 'US',
      admin1: en ? `Province ${a1}` : `시도${a1}`,
      admin2: en ? `District ${a2}` : `구${a2}`,
    };
  },
};

function pickProvider(): Geocoder {
  switch (process.env.GEOCODER) {
    case 'google':
      return google;
    case 'fake':
      return fakeGeocoder;
    default:
      return nominatim;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * geohash 6자리(약 1.2km 격자) 단위로 결과를 캐시한다. 같은 동네 사람은 외부 API 를 다시 부르지 않는다.
 * 언어가 늘면 캐시에 없는 언어만 추가로 받는다.
 */
export async function reverseGeocode(p: LatLng): Promise<GeoResult | null> {
  const provider = pickProvider();
  const cell = geohashEncode(p, 6);
  const cacheRef = db.collection(COL.geocodeCache).doc(cell);
  const cached = (await cacheRef.get()).data() as Partial<GeoResult> | undefined;

  let parts = cached?.parts ?? null;
  const labels: Localized = { ...(cached?.labels ?? {}) };
  let calls = 0;
  const throttle = async () => {
    if (calls++ > 0 && provider.minIntervalMs) await sleep(provider.minIntervalMs);
  };

  if (!parts) {
    await throttle();
    parts = await provider.reverse(p);
    if (!parts) return null;
  }
  for (const lang of LOCALES) {
    if (labels[lang]) continue;
    await throttle();
    const localized = await provider.reverse(p, lang).catch(() => null);
    if (localized) labels[lang] = regionLabelOf(localized);
  }

  const clean = Object.fromEntries(Object.entries(parts).filter(([, v]) => v != null)) as unknown as RegionParts;
  if (calls > 0) await cacheRef.set({ parts: clean, labels });
  return { parts: clean, labels };
}
