/**
 * 네이티브 소셜 로그인. 네이티브 SDK 로 ID 토큰을 받고, 로그인 자체는 JS SDK 로 한다.
 *   Google: @react-native-google-signin → idToken → signInWithCredential
 *   Apple : expo-apple-authentication (iOS 만) + nonce → OAuthProvider('apple.com')
 * 안드로이드의 Apple 로그인은 MVP 범위 밖이다 (docs/decisions.md).
 */

import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { CryptoDigestAlgorithm, digestStringAsync, randomUUID } from 'expo-crypto';
import { GoogleAuthProvider, OAuthProvider, signInWithCredential } from 'firebase/auth';
import { Platform } from 'react-native';

import { appFail } from '../api';
import { auth } from '../config';

let configured = false;

function configureGoogle() {
  if (configured) return;
  GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID });
  configured = true;
}

export async function signInWithGoogle(): Promise<void> {
  configureGoogle();
  if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const res = await GoogleSignin.signIn();
  if (res.type !== 'success') return;
  const idToken = res.data.idToken;
  // 보통 EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID 가 비어 있을 때
  if (!idToken) throw appFail('errors.googleNoToken');
  await signInWithCredential(auth(), GoogleAuthProvider.credential(idToken));
}

export async function signInWithApple(): Promise<void> {
  const rawNonce = randomUUID();
  const hashed = await digestStringAsync(CryptoDigestAlgorithm.SHA256, rawNonce);
  const cred = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashed,
  });
  if (!cred.identityToken) throw appFail('errors.appleNoToken');
  const credential = new OAuthProvider('apple.com').credential({ idToken: cred.identityToken, rawNonce });
  await signInWithCredential(auth(), credential);
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  return Platform.OS === 'ios' && (await AppleAuthentication.isAvailableAsync());
}

export async function signOutNative(): Promise<void> {
  configureGoogle();
  await GoogleSignin.signOut().catch(() => undefined);
}
