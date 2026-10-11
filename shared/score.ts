/**
 * 추천 점수. `getRecommendations` 가 후보를 거른 뒤 이 점수로 정렬한다.
 *
 * 가중치는 WEIGHTS 한 곳에서 바꾼다. 연애성향·취미·관심사가 들어오면
 * `interestOverlap` 항목의 가중치를 올리면 된다 (지금은 데이터가 없어 0 에 가깝다).
 */

import type { DiscoverFilters, UserPublic } from './models';
import type { DistanceBucket } from './region';

export const WEIGHTS = {
  distance: { sameDistrict: 30, near: 25, sameCity: 15, sameCountry: 5, abroad: 0 } as Record<DistanceBucket, number>,
  /** 휴대폰 인증 배지 */
  verified: 10,
  /** 최근 접속. 이 시간(시간 단위) 안이면 만점, 이후 선형 감소 */
  recencyHours: 72,
  recency: 20,
  boost: 40,
  interestOverlap: 3,
  /** MBTI 가 같은 축을 몇 개 공유하는가 (가벼운 재미 요소) */
  mbtiAxis: 1,
};

export interface Candidate {
  profile: UserPublic;
  distance: DistanceBucket;
}

export function score(c: Candidate, me: Pick<UserPublic, 'mbti' | 'interests'>, nowMs: number): number {
  const p = c.profile;
  let s = WEIGHTS.distance[c.distance];
  if (p.badges.includes('phone')) s += WEIGHTS.verified;
  const hours = Math.max(0, (nowMs - p.lastActiveAt) / 3_600_000);
  s += WEIGHTS.recency * Math.max(0, 1 - hours / WEIGHTS.recencyHours);
  if (p.boostUntil > nowMs) s += WEIGHTS.boost;
  if (me.interests?.length && p.interests?.length) {
    const mine = new Set(me.interests);
    s += WEIGHTS.interestOverlap * p.interests.filter((i) => mine.has(i)).length;
  }
  if (me.mbti && p.mbti) {
    for (let i = 0; i < 4; i++) if (me.mbti[i] === p.mbti[i]) s += WEIGHTS.mbtiAxis;
  }
  return s;
}

/** Firestore 쿼리로 못 거른 조건(나이 범위·추가 필터)을 메모리에서 거른다 */
export function passesFilters(p: UserPublic, f: DiscoverFilters, extraAllowed: boolean): boolean {
  if (f.genders?.length && !f.genders.includes(p.gender)) return false;
  if (f.ageMin != null && p.age < f.ageMin) return false;
  if (f.ageMax != null && p.age > f.ageMax) return false;
  if (extraAllowed) {
    if (f.mbti?.length && (!p.mbti || !f.mbti.includes(p.mbti))) return false;
    if (f.drinking?.length && (!p.drinking || !f.drinking.includes(p.drinking))) return false;
    if (f.smoking?.length && (!p.smoking || !f.smoking.includes(p.smoking))) return false;
  }
  return true;
}

/** 추가 필터(상점 아이템)가 걸린 필터인가 */
export function usesExtraFilters(f: DiscoverFilters | undefined): boolean {
  return Boolean(f && (f.mbti?.length || f.drinking?.length || f.smoking?.length));
}

/** 필터 값을 안전한 범위로 정리 */
export function sanitizeFilters(raw: unknown): DiscoverFilters {
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as Record<string, unknown>;
  const out: DiscoverFilters = {};
  const arr = (v: unknown, max: number) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, max) : undefined;
  const g = arr(r.genders, 3);
  if (g?.length) out.genders = g as DiscoverFilters['genders'];
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : undefined);
  const min = num(r.ageMin);
  const max = num(r.ageMax);
  if (min != null) out.ageMin = Math.min(99, Math.max(18, min));
  if (max != null) out.ageMax = Math.min(99, Math.max(18, max));
  if (out.ageMin != null && out.ageMax != null && out.ageMin > out.ageMax) {
    [out.ageMin, out.ageMax] = [out.ageMax, out.ageMin];
  }
  if (r.scope === 'country' || r.scope === 'admin1' || r.scope === 'district') out.scope = r.scope;
  const m = arr(r.mbti, 16);
  if (m?.length) out.mbti = m as DiscoverFilters['mbti'];
  const d = arr(r.drinking, 3);
  if (d?.length) out.drinking = d as DiscoverFilters['drinking'];
  const s = arr(r.smoking, 3);
  if (s?.length) out.smoking = s as DiscoverFilters['smoking'];
  return out;
}
