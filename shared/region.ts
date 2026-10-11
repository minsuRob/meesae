/**
 * 지역·거리 규칙.
 *
 * 개인 좌표는 users_private 에만 있고, 밖으로 나가는 것은 구(區) 단위 라벨과
 * 거리 "버킷" 뿐이다. 좌표를 다루는 계산은 전부 서버에서 이 파일로 한다.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/** 역지오코딩 결과에서 쓰는 부분 */
export interface RegionParts {
  /** ISO 3166-1 alpha-2 (대문자) */
  countryCode: string;
  /** 시·도 (예: 서울특별시, California) */
  admin1?: string;
  /** 구·군·시 (예: 성북구, Santa Clara County) */
  admin2?: string;
  /** admin2 가 없을 때 쓰는 도시 이름 */
  locality?: string;
}

export type DistanceBucket = 'sameDistrict' | 'near' | 'sameCity' | 'sameCountry' | 'abroad';

/** 이 거리 안이면 '근처' */
export const NEAR_KM = 10;

/** 키에 들어갈 수 없는 문자('/' 등)를 걷어낸다. Firestore 문서 ID 로도 쓴다. */
function keyPart(s: string | undefined): string {
  return (s ?? '').trim().replace(/[/\s#?[\]]+/g, '_') || '-';
}

/** `KR/서울특별시/성북구` → 문서 ID 로 쓰기 위해 `KR~서울특별시~성북구` */
export function regionKeyOf(p: RegionParts): string {
  return [keyPart(p.countryCode.toUpperCase()), keyPart(p.admin1), keyPart(p.admin2 ?? p.locality)].join('~');
}

/** 화면에 보여 줄 짧은 이름. 구가 없으면 도시, 그것도 없으면 시·도 (언어별로 따로 만든다) */
export function regionLabelOf(p: RegionParts): string {
  return p.admin2 || p.locality || p.admin1 || p.countryCode.toUpperCase();
}

/** `KR~서울특별시~성북구` → `KR~서울특별시` */
export function admin1KeyOf(regionKey: string): string {
  return regionKey.split('~').slice(0, 2).join('~');
}

export function countryOfRegionKey(key: string): string {
  return key.split('~')[0] ?? '';
}

export function admin1OfRegionKey(key: string): string {
  return key.split('~')[1] ?? '';
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface Placed {
  regionKey?: string;
  location?: LatLng;
}

/**
 * 두 사람 사이 거리를 버킷으로. 좌표가 없으면 regionKey 만으로 판단한다.
 * 같은 구여도 좌표상 멀 수 있지만(큰 군 단위) 라벨이 같으면 같은 동네로 본다.
 */
export function distanceBucket(a: Placed, b: Placed): DistanceBucket {
  if (a.regionKey && b.regionKey && a.regionKey === b.regionKey) return 'sameDistrict';
  if (a.location && b.location && haversineKm(a.location, b.location) <= NEAR_KM) return 'near';
  if (a.regionKey && b.regionKey) {
    const ca = countryOfRegionKey(a.regionKey);
    const cb = countryOfRegionKey(b.regionKey);
    if (ca !== cb) return 'abroad';
    if (admin1OfRegionKey(a.regionKey) === admin1OfRegionKey(b.regionKey)) return 'sameCity';
    return 'sameCountry';
  }
  return 'sameCountry';
}

export function isValidLatLng(v: unknown): v is LatLng {
  if (!v || typeof v !== 'object') return false;
  const { lat, lng } = v as Record<string, unknown>;
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** 이동 속도(km/h). 시간이 0 이하이면 Infinity */
export function speedKmh(from: LatLng, fromMs: number, to: LatLng, toMs: number): number {
  const hours = (toMs - fromMs) / 3_600_000;
  if (hours <= 0) return haversineKm(from, to) === 0 ? 0 : Infinity;
  return haversineKm(from, to) / hours;
}

// ── geohash ──────────────────────────────────────────────────────────────

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function geohashEncode({ lat, lng }: LatLng, precision = 9): string {
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;
  let hash = '';
  let bit = 0;
  let ch = 0;
  let even = true;
  while (hash.length < precision) {
    if (even) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) {
        ch = (ch << 1) | 1;
        lngMin = mid;
      } else {
        ch <<= 1;
        lngMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        ch = (ch << 1) | 1;
        latMin = mid;
      } else {
        ch <<= 1;
        latMax = mid;
      }
    }
    even = !even;
    if (++bit === 5) {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}

/** geohash 셀의 중심 */
export function geohashCenter(hash: string): LatLng {
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;
  let even = true;
  for (const c of hash) {
    const idx = BASE32.indexOf(c);
    if (idx < 0) throw new Error(`잘못된 geohash 문자: ${c}`);
    for (let b = 4; b >= 0; b--) {
      const on = (idx >> b) & 1;
      if (even) {
        const mid = (lngMin + lngMax) / 2;
        if (on) lngMin = mid;
        else lngMax = mid;
      } else {
        const mid = (latMin + latMax) / 2;
        if (on) latMin = mid;
        else latMax = mid;
      }
      even = !even;
    }
  }
  return { lat: (latMin + latMax) / 2, lng: (lngMin + lngMax) / 2 };
}

/**
 * 지도 마커 위치로 쓰는 거친 좌표. geohash 5자리(약 5km 격자)의 중심이라
 * 개인 위치를 되짚을 수 없다.
 */
export const COARSE_GEOHASH_PRECISION = 5;

export function coarsen(p: LatLng): LatLng {
  return geohashCenter(geohashEncode(p, COARSE_GEOHASH_PRECISION));
}
