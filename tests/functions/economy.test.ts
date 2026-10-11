/**
 * 포인트 경제 통합 테스트: 무료 횟수 → 포인트 차감, 잔액 부족, 멱등키.
 *   npm run test:functions
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ECONOMY } from '../../shared/economy';
import { cleanup, errorCode, onboard, rid, seedTarget, setBalance, signIn, wallet, type TestUser } from './helpers';

let alice: TestUser;

beforeAll(async () => {
  alice = await signIn('alice');
  await onboard(alice);
});

afterAll(cleanup);

describe('첫 대화(intro)', () => {
  it(`${ECONOMY.INTRO_FREE_LIMIT}회까지 무료, 그다음부터 ${ECONOMY.INTRO_COST}P`, async () => {
    const targets = Array.from({ length: ECONOMY.INTRO_FREE_LIMIT + 2 }, (_, i) => `intro-target-${i}`);
    await Promise.all(targets.map(seedTarget));
    await setBalance(alice.uid, 0);

    for (let i = 0; i < ECONOMY.INTRO_FREE_LIMIT; i++) {
      const r = await alice.call('startConversation', { targetUid: targets[i]!, clientRequestId: rid() });
      expect(r.free).toBe(true);
      expect(r.kind).toBe('intro');
    }
    expect((await wallet(alice.uid)).freeIntrosUsed).toBe(ECONOMY.INTRO_FREE_LIMIT);

    // 11번째: 잔액 0 → 거부, 대화방도 안 생긴다
    const eleventh = targets[ECONOMY.INTRO_FREE_LIMIT]!;
    expect(await errorCode(alice.call('startConversation', { targetUid: eleventh, clientRequestId: rid() }))).toBe(
      'INSUFFICIENT_POINTS',
    );

    await setBalance(alice.uid, 100);
    const paid = await alice.call('startConversation', { targetUid: eleventh, clientRequestId: rid() });
    expect(paid).toMatchObject({ free: false, charged: ECONOMY.INTRO_COST, balance: 100 - ECONOMY.INTRO_COST });

    // 이미 있는 대화는 다시 열어도 무료
    const again = await alice.call('startConversation', { targetUid: eleventh, clientRequestId: rid() });
    expect(again).toMatchObject({ existed: true, charged: 0 });
  });

  it('같은 멱등키로 다시 보내면 한 번만 차감', async () => {
    const target = 'idem-target';
    await seedTarget(target);
    await setBalance(alice.uid, 100);
    const id = rid();
    const a = await alice.call('startConversation', { targetUid: target, clientRequestId: id });
    const b = await alice.call('startConversation', { targetUid: target, clientRequestId: id });
    expect(b).toEqual(a);
    expect((await wallet(alice.uid)).balance).toBe(100 - ECONOMY.INTRO_COST);
  });
});

describe('좋아요', () => {
  it(`하루 ${ECONOMY.LIKE_FREE_PER_DAY}회 무료, 그다음 ${ECONOMY.LIKE_COST}P, 잔액 부족이면 거부`, async () => {
    const liker = await signIn('liker');
    await onboard(liker);
    await setBalance(liker.uid, ECONOMY.LIKE_COST);
    const targets = Array.from({ length: ECONOMY.LIKE_FREE_PER_DAY + 2 }, (_, i) => `like-target-${liker.uid}-${i}`);
    await Promise.all(targets.map(seedTarget));

    for (let i = 0; i < ECONOMY.LIKE_FREE_PER_DAY; i++) {
      expect((await liker.call('likeUser', { targetUid: targets[i]!, clientRequestId: rid() })).free).toBe(true);
    }
    const paid = await liker.call('likeUser', { targetUid: targets[ECONOMY.LIKE_FREE_PER_DAY]!, clientRequestId: rid() });
    expect(paid).toMatchObject({ free: false, charged: ECONOMY.LIKE_COST, balance: 0 });
    expect(
      await errorCode(liker.call('likeUser', { targetUid: targets[ECONOMY.LIKE_FREE_PER_DAY + 1]!, clientRequestId: rid() })),
    ).toBe('INSUFFICIENT_POINTS');
    // 같은 사람에게 두 번은 안 된다
    expect(await errorCode(liker.call('likeUser', { targetUid: targets[0]!, clientRequestId: rid() }))).toBe('ALREADY_LIKED');
  });

  it('서로 좋아요하면 매치 + 대화방', async () => {
    const a = await signIn('mutual-a');
    const b = await signIn('mutual-b');
    await Promise.all([onboard(a), onboard(b)]);
    const first = await a.call('likeUser', { targetUid: b.uid, clientRequestId: rid() });
    expect(first.matched).toBe(false);
    const second = await b.call('likeUser', { targetUid: a.uid, clientRequestId: rid() });
    expect(second.matched).toBe(true);
    expect(second.conversationId).toBe([a.uid, b.uid].sort().join('_'));
  });
});

describe('보상·상점', () => {
  it('출석은 하루 한 번', async () => {
    const u = await signIn('checkin');
    await onboard(u);
    const first = await u.call('dailyCheckIn', {});
    expect(first.rewarded).toBe(ECONOMY.CHECKIN_REWARD);
    const second = await u.call('dailyCheckIn', {});
    expect(second).toEqual({ rewarded: 0, balance: first.balance });
  });

  it('위치 인증 보상은 하루 한 번, 지역 라벨만 공개', async () => {
    const u = await signIn('loc');
    const r1 = await u.call('updateLocation', { lat: 37.5894, lng: 127.0167, accuracy: 30 });
    expect(r1.rewarded).toBe(ECONOMY.LOCATION_REWARD);
    // 지역 이름은 지원 언어마다 따로, regionKey 는 언어와 무관
    expect(r1.regionLabels.ko).toMatch(/^구/);
    expect(r1.regionLabels.en).toMatch(/^District/);
    expect(r1.regionKey.startsWith('KR~')).toBe(true);
    const r2 = await u.call('updateLocation', { lat: 37.5895, lng: 127.0168, accuracy: 30 });
    expect(r2.rewarded).toBe(0);
    await onboard(u);
    const stats = await u.call('getRegionStats', {});
    expect(stats.mine).toBe(r1.regionKey);
    const mine = stats.regions.find((r) => r.regionKey === r1.regionKey);
    expect(mine?.count).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(stats)).not.toContain('37.5894');
  });

  it('부정확한 위치는 보상하지 않는다', async () => {
    const u = await signIn('loc-bad');
    const r = await u.call('updateLocation', { lat: 37.5, lng: 127, accuracy: 5000 });
    expect(r.rewarded).toBe(0);
  });

  it('상점: 잔액 부족이면 거부, 구매하면 기간이 붙는다', async () => {
    const u = await signIn('shop');
    await onboard(u);
    await setBalance(u.uid, 0);
    expect(await errorCode(u.call('purchaseItem', { itemId: 'boost', clientRequestId: rid() }))).toBe('INSUFFICIENT_POINTS');
    await setBalance(u.uid, 1000);
    const r = await u.call('purchaseItem', { itemId: 'boost', clientRequestId: rid() });
    expect(r.until).toBeGreaterThan(Date.now());
    expect(r.balance).toBe(900);
  });
});
