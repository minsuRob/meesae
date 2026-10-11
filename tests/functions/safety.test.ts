/**
 * 권한·안전 통합 테스트: 온보딩 전 차단, 남의 대화방, 차단 후 전송, 사진 전송 권한, 휴대폰 인증.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { admin, cleanup, errorCode, onboard, rid, signIn, type TestUser } from './helpers';

let alice: TestUser;
let bob: TestUser;
let carol: TestUser;
let convId: string;

beforeAll(async () => {
  [alice, bob, carol] = await Promise.all([signIn('s-alice'), signIn('s-bob'), signIn('s-carol')]);
  await Promise.all([onboard(alice), onboard(bob), onboard(carol)]);
  convId = (await alice.call('startConversation', { targetUid: bob.uid, clientRequestId: rid() })).conversationId;
});

afterAll(cleanup);

describe('권한', () => {
  it('온보딩 전에는 추천·대화를 못 쓴다', async () => {
    const newbie = await signIn('newbie');
    expect(await errorCode(newbie.call('getRecommendations', {}))).toBe('NOT_ONBOARDED');
    expect(await errorCode(newbie.call('startConversation', { targetUid: bob.uid, clientRequestId: rid() }))).toBe(
      'NOT_ONBOARDED',
    );
  });

  it('미성년자는 온보딩을 마칠 수 없다 (문장 대신 이슈 코드로 알린다)', async () => {
    const kid = await signIn('kid');
    const err = await onboard(kid, { birthDate: '2015-01-01' }).catch((e: { details?: unknown }) => e.details);
    expect(err).toMatchObject({ code: 'INVALID', issue: { field: 'birthDate', code: 'underage', limit: 18 } });
  });

  it('남의 대화방에는 보낼 수 없다', async () => {
    expect(await errorCode(carol.call('sendMessage', { conversationId: convId, text: 'hi', clientRequestId: rid() }))).toBe(
      'NOT_FOUND',
    );
  });

  it('사진 전송은 휴대폰 인증이 필요하다', async () => {
    expect(
      await errorCode(
        alice.call('finalizeChatImage', { conversationId: convId, path: `chat/${convId}/${alice.uid}/x.jpg`, clientRequestId: rid() }),
      ),
    ).toBe('PHONE_REQUIRED');
  });

  it('메시지 재전송은 한 건만 남는다', async () => {
    const id = rid();
    await alice.call('sendMessage', { conversationId: convId, text: '안녕하세요', clientRequestId: id });
    await alice.call('sendMessage', { conversationId: convId, text: '안녕하세요', clientRequestId: id });
    const msgs = await admin.db.collection(`conversations/${convId}/messages`).where('text', '==', '안녕하세요').get();
    expect(msgs.size).toBe(1);
    const conv = (await admin.db.doc(`conversations/${convId}`).get()).data()!;
    expect(conv.unread[bob.uid]).toBe(1);
  });
});

describe('차단', () => {
  it('차단하면 양쪽 다 보낼 수 없고 추천에서 빠진다', async () => {
    const x = await signIn('blocker');
    const y = await signIn('blocked');
    await Promise.all([onboard(x), onboard(y)]);
    const conv = await x.call('startConversation', { targetUid: y.uid, clientRequestId: rid() });
    await x.call('blockUser', { targetUid: y.uid });
    expect(await errorCode(y.call('sendMessage', { conversationId: conv.conversationId, text: 'hey', clientRequestId: rid() }))).toBe(
      'CONVERSATION_CLOSED',
    );
    expect(await errorCode(y.call('likeUser', { targetUid: x.uid, clientRequestId: rid() }))).toBe('BLOCKED');
    expect(await errorCode(y.call('getProfile', { uid: x.uid }))).toBe('NOT_FOUND');
    const rec = await y.call('getRecommendations', { filters: { scope: 'country', ageMin: 18, ageMax: 99 } });
    expect(rec.items.map((p) => p.uid)).not.toContain(x.uid);
  });
});

describe('휴대폰 인증', () => {
  it('Auth 에 번호가 있어야 하고, 같은 번호로 두 계정은 안 된다', async () => {
    const p1 = await signIn('phone-1');
    const p2 = await signIn('phone-2');
    await Promise.all([onboard(p1), onboard(p2)]);
    expect(await errorCode(p1.call('claimPhoneVerified', {}))).toBe('NO_PHONE');

    await admin.auth.updateUser(p1.uid, { phoneNumber: '+821011112222' });
    const r = await p1.call('claimPhoneVerified', {});
    expect(r.rewarded).toBeGreaterThan(0);
    const claims = (await admin.auth.getUser(p1.uid)).customClaims;
    expect(claims).toMatchObject({ onboarded: true, phoneVerified: true });
    expect((await admin.db.doc(`users_public/${p1.uid}`).get()).get('badges')).toContain('phone');

    // 다른 계정에 같은 번호를 붙이려 하면 거부 (Auth 에뮬레이터는 중복 번호를 막지 않으므로 서버 인덱스가 막는다)
    await admin.auth.deleteUser(p1.uid).catch(() => undefined);
    await admin.auth.updateUser(p2.uid, { phoneNumber: '+821011112222' });
    expect(await errorCode(p2.call('claimPhoneVerified', {}))).toBe('PHONE_IN_USE');
  });
});

describe('탈퇴', () => {
  it('한 명이 나가면 대화방은 닫히고 기록은 남는다, 마지막 사람이 나가면 통째로 지운다', async () => {
    const x = await signIn('leave-x');
    const y = await signIn('leave-y');
    await Promise.all([onboard(x), onboard(y)]);
    const { conversationId } = await x.call('startConversation', { targetUid: y.uid, clientRequestId: rid() });
    await x.call('sendMessage', { conversationId, text: '안녕', clientRequestId: rid() });

    await x.call('deleteAccount', { confirm: 'DELETE' });
    const afterFirst = await admin.db.doc(`conversations/${conversationId}`).get();
    expect(afterFirst.get('closedBy')).toBe(x.uid);
    expect((await admin.db.collection(`conversations/${conversationId}/messages`).get()).size).toBe(1);

    await y.call('deleteAccount', { confirm: 'DELETE' });
    expect((await admin.db.doc(`conversations/${conversationId}`).get()).exists).toBe(false);
    expect((await admin.db.collection(`conversations/${conversationId}/messages`).get()).size).toBe(0);
    expect((await admin.db.doc(`users_public/${y.uid}`).get()).exists).toBe(false);
  });
});
