/**
 * 에뮬레이터 전용 가짜 로그인. Auth 에뮬레이터는 ID 토큰 서명을 검사하지 않으므로
 * JSON 문자열을 구글 토큰처럼 넘기면 그 sub 로 계정이 만들어진다. 실제 프로젝트에서는 실패한다.
 */

import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

import { auth, USE_EMULATOR } from '../config';

export const DEV_LOGIN_ENABLED = USE_EMULATOR;

export async function devSignIn(name: string): Promise<void> {
  if (!USE_EMULATOR) throw new Error('dev sign-in only works with the emulator');
  const id = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'tester';
  const token = JSON.stringify({ sub: `dev-${id}`, email: `${id}@example.com`, email_verified: true, name: id });
  await signInWithCredential(auth(), GoogleAuthProvider.credential(token));
}
