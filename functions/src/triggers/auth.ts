/**
 * 인증 트리거.
 *
 * onAuthCreate: 가입 직후 지갑·내부 문서를 만든다 (클라이언트는 둘 다 쓸 수 없다).
 * beforeSignIn: 정지 계정의 로그인 자체를 막는다. Identity Platform 업그레이드가 필요하다
 *               (콘솔 체크리스트 docs/setup.md 참고).
 */

import * as functionsV1 from 'firebase-functions/v1';
import { HttpsError } from 'firebase-functions/v2/https';
import { beforeUserSignedIn } from 'firebase-functions/v2/identity';

import type { UserInternal } from '../../../shared/models';
import { db } from '../lib/admin';
import { emptyWallet } from '../lib/ledger';
import { internalRef, walletRef } from '../lib/users';

export const onAuthCreate = functionsV1
  .region('asia-northeast3')
  .auth.user()
  .onCreate(async (user) => {
    const t = Date.now();
    const internal: UserInternal = {
      uid: user.uid,
      riskScore: 0,
      reportCount: 0,
      banReason: null,
      rewards: {},
      createdAt: t,
    };
    await db.runTransaction(async (tx) => {
      const [w, i] = await Promise.all([tx.get(walletRef(user.uid)), tx.get(internalRef(user.uid))]);
      if (!w.exists) tx.set(walletRef(user.uid), emptyWallet(user.uid, t));
      // 탈퇴 후 재가입이면 이전 riskScore 를 살린다
      if (!i.exists) tx.set(internalRef(user.uid), internal);
      else tx.set(internalRef(user.uid), { deletedAt: null }, { merge: true });
    });
  });

export const beforeSignIn = beforeUserSignedIn({ region: 'asia-northeast3' }, (event) => {
  if (event.data?.customClaims?.banned === true) {
    throw new HttpsError('permission-denied', 'ACCOUNT_RESTRICTED');
  }
});
