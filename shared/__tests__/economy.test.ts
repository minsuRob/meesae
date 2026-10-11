import { describe, expect, it } from 'vitest';

import {
  canClaimDaily,
  dayKey,
  ECONOMY,
  introCharge,
  likeCharge,
  mergeEconomy,
  remainingFreeIntros,
  remainingFreeLikes,
} from '../economy';

describe('economy', () => {
  it('첫 대화는 10회까지 무료, 11번째부터 포인트', () => {
    expect(introCharge(0)).toEqual({ free: true, cost: 0 });
    expect(introCharge(9)).toEqual({ free: true, cost: 0 });
    expect(introCharge(10)).toEqual({ free: false, cost: ECONOMY.INTRO_COST });
    expect(remainingFreeIntros(7)).toBe(3);
    expect(remainingFreeIntros(12)).toBe(0);
  });

  it('좋아요는 하루 3회 무료, 날짜가 바뀌면 다시 무료', () => {
    const today = '2026-10-11';
    expect(likeCharge(undefined, today).free).toBe(true);
    expect(likeCharge({ date: today, count: 2 }, today).free).toBe(true);
    expect(likeCharge({ date: today, count: 3 }, today)).toEqual({ free: false, cost: ECONOMY.LIKE_COST });
    expect(likeCharge({ date: '2026-10-10', count: 99 }, today).free).toBe(true);
    expect(remainingFreeLikes({ date: today, count: 1 }, today)).toBe(2);
  });

  it('하루 경계는 한국 자정 (UTC+9)', () => {
    // 2026-10-11 14:59:59Z = 한국 23:59:59
    expect(dayKey(Date.UTC(2026, 9, 11, 14, 59, 59))).toBe('2026-10-11');
    expect(dayKey(Date.UTC(2026, 9, 11, 15, 0, 0))).toBe('2026-10-12');
    expect(dayKey(Date.UTC(2026, 9, 11, 15, 0, 0), 0)).toBe('2026-10-11');
  });

  it('하루 1회 보상', () => {
    expect(canClaimDaily(undefined, '2026-10-11')).toBe(true);
    expect(canClaimDaily('2026-10-11', '2026-10-11')).toBe(false);
  });

  it('운영 문서는 숫자·0 이상만 덮어쓴다', () => {
    const eco = mergeEconomy({ INTRO_COST: 50, LIKE_COST: -1, CHECKIN_REWARD: 'x', UNKNOWN: 3 });
    expect(eco.INTRO_COST).toBe(50);
    expect(eco.LIKE_COST).toBe(ECONOMY.LIKE_COST);
    expect(eco.CHECKIN_REWARD).toBe(ECONOMY.CHECKIN_REWARD);
    expect('UNKNOWN' in eco).toBe(false);
    expect(introCharge(10, mergeEconomy({ INTRO_FREE_LIMIT: 20 })).free).toBe(true);
  });
});
