/**
 * 웹 소셜 로그인: 팝업. 네이티브는 social.native.ts.
 */

import { GoogleAuthProvider, OAuthProvider, signInWithPopup } from 'firebase/auth';

import { auth } from '../config';

export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(auth(), new GoogleAuthProvider());
}

export async function signInWithApple(): Promise<void> {
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  await signInWithPopup(auth(), provider);
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  return true;
}

export async function signOutNative(): Promise<void> {}
