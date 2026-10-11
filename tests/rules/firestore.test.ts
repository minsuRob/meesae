/**
 * firestore.rules 검증. 에뮬레이터에서만 돈다:  npm run test:rules
 *
 * 원칙: 민감한 쓰기는 전부 Functions 가 하므로, 클라이언트 쓰기는 users_private 의 설정 필드 말고 전부 거부돼야 한다.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;
const NOW = Date.now();

const ON = { onboarded: true };
const db = (uid: string, claims: Record<string, unknown> = ON) => env.authenticatedContext(uid, claims).firestore();
const anon = () => env.unauthenticatedContext().firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-meesae',
    firestore: { rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

// alice·bob 은 대화 중, carol 은 제3자. dave 는 alice 를 차단했다.
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const d = ctx.firestore();
    for (const uid of ['alice', 'bob', 'carol', 'dave']) {
      await setDoc(doc(d, 'users_public', uid), { uid, nickname: uid, visible: true, countryCode: 'KR' });
      await setDoc(doc(d, 'users_private', uid), { uid, birthDate: '1995-01-01', filters: {}, fcmTokens: [] });
      await setDoc(doc(d, 'wallets', uid), { uid, balance: 100 });
    }
    await setDoc(doc(d, 'users_public', 'hidden'), { uid: 'hidden', visible: false });
    await setDoc(doc(d, 'blocks', 'dave', 'targets', 'alice'), { ownerUid: 'dave', targetUid: 'alice' });
    await setDoc(doc(d, 'conversations', 'alice_bob'), {
      id: 'alice_bob',
      members: ['alice', 'bob'],
      kind: 'intro',
      updatedAt: NOW,
    });
    await setDoc(doc(d, 'conversations', 'alice_bob', 'messages', 'm1'), {
      senderUid: 'alice',
      type: 'text',
      text: 'hi',
      createdAt: NOW,
    });
    await setDoc(doc(d, 'location_shares', 'live'), { members: ['alice', 'bob'], expiresAt: NOW + 600_000, positions: {} });
    await setDoc(doc(d, 'location_shares', 'expired'), { members: ['alice', 'bob'], expiresAt: NOW - 1000, positions: {} });
    await setDoc(doc(d, 'posts', 'p1'), { authorUid: 'bob', status: 'visible', countryCode: 'KR', createdAt: NOW, text: 'x' });
    await setDoc(doc(d, 'posts', 'p2'), { authorUid: 'bob', status: 'hidden', countryCode: 'KR', createdAt: NOW, text: 'y' });
    await setDoc(doc(d, 'config', 'economy'), { INTRO_COST: 30 });
    await setDoc(doc(d, 'users_internal', 'alice'), { riskScore: 0 });
    await setDoc(doc(d, 'region_stats', 'KR~a~b'), { count: 1 });
  });
});

describe('사용자 문서', () => {
  it('공개 프로필: 온보딩한 사용자는 단건 조회 가능, 목록 조회는 불가', async () => {
    await assertSucceeds(getDoc(doc(db('alice'), 'users_public', 'bob')));
    await assertFails(getDocs(query(collection(db('alice'), 'users_public'), limit(10))));
  });

  it('온보딩 전·비로그인·정지 계정은 남의 공개 프로필을 못 본다', async () => {
    await assertFails(getDoc(doc(db('alice', {}), 'users_public', 'bob')));
    await assertFails(getDoc(doc(anon(), 'users_public', 'bob')));
    await assertFails(getDoc(doc(db('alice', { onboarded: true, banned: true }), 'users_public', 'bob')));
    // 본인 것은 온보딩 전에도 본다
    await assertSucceeds(getDoc(doc(db('alice', {}), 'users_public', 'alice')));
  });

  it('나를 차단한 사람·숨김 처리된 사람의 프로필은 못 본다', async () => {
    await assertFails(getDoc(doc(db('alice'), 'users_public', 'dave')));
    await assertFails(getDoc(doc(db('alice'), 'users_public', 'hidden')));
  });

  it('공개 프로필은 본인도 직접 못 쓴다 (서버만)', async () => {
    await assertFails(updateDoc(doc(db('alice'), 'users_public', 'alice'), { nickname: 'hacked' }));
    await assertFails(setDoc(doc(db('alice'), 'users_public', 'alice'), { badges: ['phone'] }));
  });

  it('비공개 문서: 본인만 읽고, 설정 필드만 바꿀 수 있다', async () => {
    await assertSucceeds(getDoc(doc(db('alice'), 'users_private', 'alice')));
    await assertFails(getDoc(doc(db('bob'), 'users_private', 'alice')));
    await assertSucceeds(updateDoc(doc(db('alice'), 'users_private', 'alice'), { filters: { scope: 'district' } }));
    await assertFails(updateDoc(doc(db('alice'), 'users_private', 'alice'), { birthDate: '2010-01-01' }));
    await assertFails(updateDoc(doc(db('alice'), 'users_private', 'alice'), { location: { lat: 0, lng: 0 } }));
    await assertFails(updateDoc(doc(db('alice'), 'users_private', 'alice'), { filters: 'oops' }));
    await assertFails(updateDoc(doc(db('alice', { onboarded: true, banned: true }), 'users_private', 'alice'), { filters: {} }));
  });

  it('내부 문서는 아무도 못 읽는다', async () => {
    await assertFails(getDoc(doc(db('alice'), 'users_internal', 'alice')));
  });
});

describe('포인트', () => {
  it('지갑은 본인만 읽고, 아무도 못 쓴다', async () => {
    await assertSucceeds(getDoc(doc(db('alice'), 'wallets', 'alice')));
    await assertFails(getDoc(doc(db('bob'), 'wallets', 'alice')));
    await assertFails(updateDoc(doc(db('alice'), 'wallets', 'alice'), { balance: 999999 }));
    await assertFails(addDoc(collection(db('alice'), 'wallets', 'alice', 'ledger'), { delta: 1000 }));
  });

  it('운영 설정은 읽기만, 관리자만 쓴다', async () => {
    await assertSucceeds(getDoc(doc(db('alice'), 'config', 'economy')));
    await assertFails(setDoc(doc(db('alice'), 'config', 'economy'), { INTRO_COST: 0 }));
    await assertSucceeds(setDoc(doc(db('admin', { role: 'admin' }), 'config', 'economy'), { INTRO_COST: 40 }));
  });
});

describe('대화', () => {
  it('멤버만 대화방·메시지를 읽는다', async () => {
    await assertSucceeds(getDoc(doc(db('bob'), 'conversations', 'alice_bob')));
    await assertSucceeds(getDocs(collection(db('bob'), 'conversations', 'alice_bob', 'messages')));
    await assertFails(getDoc(doc(db('carol'), 'conversations', 'alice_bob')));
    await assertFails(getDocs(collection(db('carol'), 'conversations', 'alice_bob', 'messages')));
  });

  it('목록 조회는 내 uid 로 거른 쿼리만 통과', async () => {
    const mine = query(collection(db('alice'), 'conversations'), where('members', 'array-contains', 'alice'), orderBy('updatedAt', 'desc'));
    await assertSucceeds(getDocs(mine));
    await assertFails(getDocs(collection(db('alice'), 'conversations')));
  });

  it('메시지는 멤버라도 직접 못 쓴다 (발신자 위조·차단 우회 방지)', async () => {
    await assertFails(
      addDoc(collection(db('bob'), 'conversations', 'alice_bob', 'messages'), { senderUid: 'alice', text: '위조', type: 'text' }),
    );
    await assertFails(setDoc(doc(db('bob'), 'conversations', 'alice_bob', 'messages', 'm1'), { text: '수정' }));
    await assertFails(updateDoc(doc(db('bob'), 'conversations', 'alice_bob'), { closedBy: null }));
  });

  it('좋아요·매치·신고·차단 문서는 직접 못 만든다', async () => {
    await assertFails(setDoc(doc(db('alice'), 'likes', 'alice_bob'), { from: 'alice', to: 'bob' }));
    await assertFails(setDoc(doc(db('alice'), 'matches', 'alice_bob'), { members: ['alice', 'bob'] }));
    await assertFails(addDoc(collection(db('alice'), 'reports'), { targetUid: 'bob' }));
    await assertFails(setDoc(doc(db('alice'), 'blocks', 'alice', 'targets', 'bob'), {}));
    await assertSucceeds(getDoc(doc(db('dave'), 'blocks', 'dave', 'targets', 'alice')));
    await assertFails(getDoc(doc(db('alice'), 'blocks', 'dave', 'targets', 'alice')));
  });
});

describe('위치공유', () => {
  it('진행 중인 공유는 멤버만, 만료되면 멤버도 못 본다', async () => {
    await assertSucceeds(getDoc(doc(db('alice'), 'location_shares', 'live')));
    await assertFails(getDoc(doc(db('carol'), 'location_shares', 'live')));
    await assertFails(getDoc(doc(db('alice'), 'location_shares', 'expired')));
    await assertFails(updateDoc(doc(db('alice'), 'location_shares', 'live'), { expiresAt: NOW + 99_999_999 }));
  });
});

describe('피드', () => {
  it('보이는 글만, 상태 조건을 건 목록 조회만 통과', async () => {
    await assertSucceeds(getDoc(doc(db('alice'), 'posts', 'p1')));
    await assertFails(getDoc(doc(db('alice'), 'posts', 'p2')));
    await assertSucceeds(getDoc(doc(db('bob'), 'posts', 'p2'))); // 작성자는 숨김 글도 본다
    await assertSucceeds(getDocs(query(collection(db('alice'), 'posts'), where('status', '==', 'visible'), orderBy('createdAt', 'desc'))));
    await assertFails(getDocs(collection(db('alice'), 'posts')));
  });

  it('글·댓글·좋아요는 직접 못 쓴다', async () => {
    await assertFails(addDoc(collection(db('alice'), 'posts'), { authorUid: 'alice', text: 'x', status: 'visible' }));
    await assertFails(updateDoc(doc(db('bob'), 'posts', 'p1'), { likeCount: 9999 }));
    await assertFails(addDoc(collection(db('alice'), 'posts', 'p1', 'comments'), { text: 'x' }));
    await assertFails(setDoc(doc(db('alice'), 'posts', 'p1', 'likes', 'alice'), { uid: 'alice' }));
  });
});

describe('그 밖의 컬렉션', () => {
  it('집계·인덱스·레이트리밋은 클라이언트에 닫혀 있다', async () => {
    await assertFails(getDoc(doc(db('alice'), 'region_stats', 'KR~a~b')));
    await assertFails(getDoc(doc(db('alice'), 'phone_index', 'x')));
    await assertFails(setDoc(doc(db('alice'), 'rate_limits', 'alice~message'), { count: 0 }));
  });
});
