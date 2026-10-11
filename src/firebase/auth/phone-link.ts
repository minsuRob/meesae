/**
 * 받은 인증번호로 현재 계정에 전화번호를 연결하고, 서버에 권한 상승을 요청한다.
 */

import { linkWithCredential, PhoneAuthProvider } from 'firebase/auth';

import { appFail, call } from '../api';
import { auth } from '../config';

export async function confirmPhoneCode(verificationId: string, code: string): Promise<{ rewarded: number }> {
  const user = auth().currentUser;
  if (!user) throw appFail('errors.signInAgain');
  const credential = PhoneAuthProvider.credential(verificationId, code.trim());
  if (!user.phoneNumber) await linkWithCredential(user, credential);
  const res = await call('claimPhoneVerified', {});
  await user.getIdToken(true); // phoneVerified 클레임을 바로 받는다
  return res;
}
