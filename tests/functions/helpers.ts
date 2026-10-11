/**
 * Functions 통합 테스트 도우미. emulators:exec 가 *_EMULATOR_HOST 환경 변수를 넣어 준다.
 * 설정(시드·클레임·Storage 파일)은 Admin SDK 로, 호출은 앱과 같은 JS SDK 로 한다.
 */

import { getApps as adminApps, initializeApp as adminInit } from 'firebase-admin/app';
import { getAuth as adminAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithCredential, type User } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';

import type { ApiName, ApiReq, ApiRes } from '../../shared/api';

export const PROJECT = 'demo-meesae-test';
const BUCKET = `${PROJECT}.appspot.com`;
const [AUTH_HOST, AUTH_PORT] = (process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099').split(':');

if (!adminApps().length) adminInit({ projectId: PROJECT, storageBucket: BUCKET });
export const admin = { db: getFirestore(), auth: adminAuth(), bucket: () => getStorage().bucket(BUCKET) };

const apps: FirebaseApp[] = [];

export interface TestUser {
  uid: string;
  user: User;
  call<N extends ApiName>(name: N, req: ApiReq<N>): Promise<ApiRes<N>>;
  refresh(): Promise<void>;
}

let seq = 0;

export async function signIn(name: string): Promise<TestUser> {
  const app = initializeApp({ apiKey: 'demo-key', projectId: PROJECT, appId: '1:0:web:0' }, `${name}-${++seq}`);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${AUTH_HOST}:${AUTH_PORT}`, { disableWarnings: true });
  const fns = getFunctions(app, 'asia-northeast3');
  connectFunctionsEmulator(fns, '127.0.0.1', 5001);
  const token = JSON.stringify({ sub: `${name}-${seq}`, email: `${name}${seq}@example.com`, email_verified: true });
  const { user } = await signInWithCredential(auth, GoogleAuthProvider.credential(token));
  return {
    uid: user.uid,
    user,
    call: async (fn, req) => (await httpsCallable(fns, fn)(req)).data as never,
    refresh: async () => {
      await user.getIdToken(true);
    },
  };
}

/** 사진을 올리고(트리거가 건너뛰도록 processed 표시) 온보딩을 마친다 */
export async function onboard(u: TestUser, extra: Record<string, unknown> = {}): Promise<void> {
  const path = `users/${u.uid}/profile/p1.jpg`;
  await admin.bucket().file(path).save(Buffer.from('x'), {
    contentType: 'image/jpeg',
    metadata: { metadata: { processed: 'true' } },
  });
  await u.call('completeOnboarding', {
    draft: { nickname: `u${seq}${Math.floor(Math.random() * 1000)}`, birthDate: '1995-04-12', gender: 'female', photos: [path], countryCode: 'KR', ...extra },
  });
  await u.refresh();
}

/** 공개 프로필만 있는 상대 (로그인하지 않는 대상) */
export async function seedTarget(uid: string): Promise<void> {
  await admin.db.doc(`users_public/${uid}`).set({
    uid,
    nickname: uid,
    age: 30,
    gender: 'male',
    photos: [],
    mbti: null,
    drinking: null,
    smoking: null,
    job: '',
    school: '',
    countryCode: 'KR',
    regionLabel: null,
    regionKey: null,
    admin1Key: null,
    badges: [],
    lastActiveAt: Date.now(),
    boostUntil: 0,
    visible: true,
    createdAt: Date.now(),
  });
}

export async function setBalance(uid: string, balance: number): Promise<void> {
  await admin.db.doc(`wallets/${uid}`).set({ balance }, { merge: true });
}

export async function wallet(uid: string) {
  return (await admin.db.doc(`wallets/${uid}`).get()).data() ?? {};
}

export async function errorCode(p: Promise<unknown>): Promise<string | null> {
  try {
    await p;
    return null;
  } catch (e) {
    const details = (e as { details?: { code?: string } }).details;
    return details?.code ?? (e as { code?: string }).code ?? 'unknown';
  }
}

export async function cleanup(): Promise<void> {
  await Promise.all(apps.splice(0).map((a) => deleteApp(a)));
}

export function rid(): string {
  return `req${Date.now()}${Math.floor(Math.random() * 1e9)}`;
}
