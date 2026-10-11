/**
 * 네이티브 휴대폰 인증. Expo + JS SDK 는 reCAPTCHA 를 못 띄우므로
 * RNFirebase 의 네이티브 SDK 로 SMS 를 보내 verificationId 만 받아 온다.
 * 계정 연결(link)은 JS SDK 로 phone-link.ts 가 한다.
 */

import { connectAuthEmulator, getAuth, signInWithPhoneNumber, signOut } from '@react-native-firebase/auth';

import { appFail } from '../api';
import { emulatorHost, USE_EMULATOR } from '../config';

export const RECAPTCHA_CONTAINER_ID = 'recaptcha-container';

let emulatorConnected = false;

export async function requestPhoneCode(e164: string): Promise<string> {
  const native = getAuth();
  if (USE_EMULATOR && !emulatorConnected) {
    connectAuthEmulator(native, `http://${emulatorHost()}:9099`);
    emulatorConnected = true;
  }
  const confirmation = await signInWithPhoneNumber(native, e164);
  // 안드로이드 자동 인증이 네이티브 세션을 만들 수 있다. 우리는 JS SDK 세션만 쓰므로 정리한다.
  if (native.currentUser) await signOut(native).catch(() => undefined);
  if (!confirmation.verificationId) throw appFail('errors.unknown');
  return confirmation.verificationId;
}
