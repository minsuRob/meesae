import { describe, expect, it } from 'vitest';

import {
  admin1KeyOf,
  coarsen,
  distanceBucket,
  geohashCenter,
  geohashEncode,
  haversineKm,
  isValidLatLng,
  regionKeyOf,
  regionLabelOf,
  speedKmh,
} from '../region';

const SEONGBUK = { lat: 37.5894, lng: 127.0167 };
const GANGNAM = { lat: 37.4979, lng: 127.0276 };
const BUSAN = { lat: 35.1796, lng: 129.0756 };

describe('region', () => {
  it('regionKey 와 라벨', () => {
    const p = { countryCode: 'kr', admin1: '서울특별시', admin2: '성북구' };
    expect(regionKeyOf(p)).toBe('KR~서울특별시~성북구');
    expect(regionLabelOf(p)).toBe('성북구');
    expect(regionLabelOf({ countryCode: 'US', admin1: 'California', locality: 'San Jose' })).toBe('San Jose');
    expect(regionKeyOf({ countryCode: 'US', admin1: 'A/B' })).toBe('US~A_B~-');
    expect(admin1KeyOf('KR~서울특별시~성북구')).toBe('KR~서울특별시');
  });

  it('거리 계산', () => {
    expect(haversineKm(SEONGBUK, GANGNAM)).toBeGreaterThan(9);
    expect(haversineKm(SEONGBUK, GANGNAM)).toBeLessThan(11);
    expect(haversineKm(SEONGBUK, BUSAN)).toBeGreaterThan(300);
  });

  it('거리 버킷', () => {
    const sb = { regionKey: 'KR~서울특별시~성북구', location: SEONGBUK };
    expect(distanceBucket(sb, { regionKey: 'KR~서울특별시~성북구' })).toBe('sameDistrict');
    expect(distanceBucket(sb, { regionKey: 'KR~서울특별시~종로구', location: { lat: 37.573, lng: 126.979 } })).toBe('near');
    expect(distanceBucket(sb, { regionKey: 'KR~서울특별시~강서구', location: { lat: 37.551, lng: 126.849 } })).toBe('sameCity');
    expect(distanceBucket(sb, { regionKey: 'KR~부산광역시~해운대구', location: BUSAN })).toBe('sameCountry');
    expect(distanceBucket(sb, { regionKey: 'JP~東京都~新宿区' })).toBe('abroad');
  });

  it('geohash 왕복 + 거친 좌표는 5km 격자 중심', () => {
    const h = geohashEncode(SEONGBUK, 9);
    expect(h).toHaveLength(9);
    const c = geohashCenter(h);
    expect(haversineKm(c, SEONGBUK)).toBeLessThan(0.01);
    const coarse = coarsen(SEONGBUK);
    expect(haversineKm(coarse, SEONGBUK)).toBeLessThan(4);
    expect(coarsen({ lat: SEONGBUK.lat + 0.001, lng: SEONGBUK.lng })).toEqual(coarse);
  });

  it('좌표 검증·속도', () => {
    expect(isValidLatLng(SEONGBUK)).toBe(true);
    expect(isValidLatLng({ lat: 91, lng: 0 })).toBe(false);
    expect(isValidLatLng({ lat: '1', lng: 2 })).toBe(false);
    expect(speedKmh(SEONGBUK, 0, BUSAN, 3_600_000)).toBeGreaterThan(300);
    expect(speedKmh(SEONGBUK, 0, GANGNAM, 3_600_000)).toBeLessThan(20);
  });
});
