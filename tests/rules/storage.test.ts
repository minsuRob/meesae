/**
 * storage.rules 검증. 본인 경로·사진·5MB·채팅 사진은 휴대폰 인증 + 대화 멤버.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { getBytes, ref, uploadBytes } from 'firebase/storage';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;

const img = (bytes = 1024) => new Uint8Array(bytes);
const JPEG = { contentType: 'image/jpeg' };
const st = (uid: string, claims: Record<string, unknown> = { onboarded: true }) => env.authenticatedContext(uid, claims).storage();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-meesae',
    storage: { rules: readFileSync(resolve(__dirname, '../../storage.rules'), 'utf8') },
    firestore: { rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearStorage();
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'conversations', 'alice_bob'), { members: ['alice', 'bob'] });
  });
});

describe('프로필 사진', () => {
  it('본인 경로에 사진만, 5MB 이하만', async () => {
    await assertSucceeds(uploadBytes(ref(st('alice', {}), 'users/alice/profile/a.jpg'), img(), JPEG));
    await assertFails(uploadBytes(ref(st('alice'), 'users/bob/profile/a.jpg'), img(), JPEG));
    await assertFails(uploadBytes(ref(st('alice'), 'users/alice/profile/a.txt'), img(), { contentType: 'text/plain' }));
    await assertFails(uploadBytes(ref(st('alice'), 'users/alice/profile/big.jpg'), img(5 * 1024 * 1024 + 1), JPEG));
  });

  it('정지 계정은 못 올린다', async () => {
    await assertFails(uploadBytes(ref(st('alice', { onboarded: true, banned: true }), 'users/alice/profile/a.jpg'), img(), JPEG));
  });

  it('온보딩 전에는 남의 사진을 못 본다', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), 'users/bob/profile/b.jpg'), img(), JPEG);
    });
    await assertFails(getBytes(ref(st('alice', {}), 'users/bob/profile/b.jpg')));
    await assertSucceeds(getBytes(ref(st('alice'), 'users/bob/profile/b.jpg')));
  });
});

describe('채팅 사진', () => {
  it('휴대폰 인증한 대화 멤버만 자기 폴더에 올린다', async () => {
    const verified = { onboarded: true, phoneVerified: true };
    await assertFails(uploadBytes(ref(st('alice'), 'chat/alice_bob/alice/1.jpg'), img(), JPEG));
    await assertSucceeds(uploadBytes(ref(st('alice', verified), 'chat/alice_bob/alice/1.jpg'), img(), JPEG));
    await assertFails(uploadBytes(ref(st('alice', verified), 'chat/alice_bob/bob/1.jpg'), img(), JPEG));
    await assertFails(uploadBytes(ref(st('carol', verified), 'chat/alice_bob/carol/1.jpg'), img(), JPEG));
  });

  it('멤버만 읽는다', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), 'chat/alice_bob/alice/1.jpg'), img(), JPEG);
    });
    await assertSucceeds(getBytes(ref(st('bob'), 'chat/alice_bob/alice/1.jpg')));
    await assertFails(getBytes(ref(st('carol'), 'chat/alice_bob/alice/1.jpg')));
  });
});

describe('그 밖의 경로', () => {
  it('정해진 폴더 밖에는 못 올린다', async () => {
    await assertFails(uploadBytes(ref(st('alice'), 'public/x.jpg'), img(), JPEG));
    await assertFails(uploadBytes(ref(st('alice'), 'users/alice/other/x.jpg'), img(), JPEG));
  });
});
