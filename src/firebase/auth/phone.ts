/**
 * 웹 휴대폰 인증: reCAPTCHA(보이지 않음) → verificationId.
 * 실제 계정 연결은 phone-link.ts 가 플랫폼 공통으로 한다.
 */

import { PhoneAuthProvider, RecaptchaVerifier } from 'firebase/auth';

import { auth, USE_EMULATOR } from '../config';

/** 웹은 이 id 의 빈 <View nativeID> 가 화면에 있어야 한다 */
export const RECAPTCHA_CONTAINER_ID = 'recaptcha-container';

let verifier: RecaptchaVerifier | null = null;

export async function requestPhoneCode(e164: string): Promise<string> {
  const a = auth();
  // 에뮬레이터는 reCAPTCHA 를 검사하지 않는다
  if (USE_EMULATOR) a.settings.appVerificationDisabledForTesting = true;
  verifier?.clear();
  verifier = new RecaptchaVerifier(a, RECAPTCHA_CONTAINER_ID, { size: 'invisible' });
  return new PhoneAuthProvider(a).verifyPhoneNumber(e164, verifier);
}
