/**
 * 안전: 차단·신고·탈퇴.
 */

import { REPORT_REASONS, type ReportReason } from '../../../shared/api';
import { COL, pairId, type UserPrivate, type UserPublic } from '../../../shared/models';
import { cleanText, LIMITS } from '../../../shared/validators';
import { auth, bucket, db } from '../lib/admin';
import { conversationRef } from '../lib/conversations';
import { callable, isUid, need } from '../lib/guard';
import { RATE } from '../lib/rateLimit';
import { blockRef, internalRef, moveRegionStat, privateRef, publicRef, walletRef } from '../lib/users';

/** 신고가 이만큼 쌓이면 검토 전까지 추천·지도에서 숨긴다 */
export const AUTO_HIDE_REPORTS = 5;

export const blockUser = callable('blockUser', {}, async ({ targetUid }, ctx) => {
  need(isUid(targetUid) && targetUid !== ctx.uid);
  const convRef = conversationRef(pairId(ctx.uid, targetUid));
  await db.runTransaction(async (tx) => {
    const conv = await tx.get(convRef);
    tx.set(blockRef(ctx.uid, targetUid), { ownerUid: ctx.uid, targetUid, createdAt: Date.now() });
    if (conv.exists && !conv.get('closedBy')) tx.update(convRef, { closedBy: ctx.uid });
  });
  return { ok: true };
});

export const unblockUser = callable('unblockUser', {}, async ({ targetUid }, ctx) => {
  need(isUid(targetUid));
  const convRef = conversationRef(pairId(ctx.uid, targetUid));
  await db.runTransaction(async (tx) => {
    const [conv, reverse] = await Promise.all([tx.get(convRef), tx.get(blockRef(targetUid, ctx.uid))]);
    tx.delete(blockRef(ctx.uid, targetUid));
    // 상대도 나를 차단했으면 대화는 계속 닫아 둔다
    if (conv.exists && conv.get('closedBy') === ctx.uid) {
      tx.update(convRef, { closedBy: reverse.exists ? targetUid : null });
    }
  });
  return { ok: true };
});

export const reportUser = callable('reportUser', { rate: RATE.report }, async (req, ctx) => {
  need(isUid(req.targetUid) && req.targetUid !== ctx.uid);
  need((REPORT_REASONS as readonly string[]).includes(req.reason), 'bad report reason');
  const detail = typeof req.detail === 'string' ? cleanText(req.detail).slice(0, LIMITS.REPORT_REASON_MAX) : '';
  const refPath = typeof req.refPath === 'string' && /^[\w/~-]{1,300}$/.test(req.refPath) ? req.refPath : null;

  await db.runTransaction(async (tx) => {
    const internal = await tx.get(internalRef(req.targetUid));
    const count = ((internal.get('reportCount') as number | undefined) ?? 0) + 1;
    tx.set(db.collection(COL.reports).doc(), {
      reporterUid: ctx.uid,
      targetUid: req.targetUid,
      reason: req.reason as ReportReason,
      detail,
      refPath,
      status: 'open',
      createdAt: Date.now(),
    });
    tx.set(internalRef(req.targetUid), { reportCount: count }, { merge: true });
    if (count === AUTO_HIDE_REPORTS) {
      tx.set(publicRef(req.targetUid), { visible: false }, { merge: true });
    }
  });
  return { ok: true };
});

async function deleteQuery(q: FirebaseFirestore.Query): Promise<void> {
  const snap = await q.get();
  await Promise.all(snap.docs.map((d) => db.recursiveDelete(d.ref)));
}

/**
 * 탈퇴. Storage → Firestore → Auth 순서로 지운다 (Auth 를 먼저 지우면 재시도할 방법이 없다).
 * 상대방의 대화 기록은 남기고 대화방만 닫는다.
 */
export const deleteAccount = callable('deleteAccount', {}, async ({ confirm }, ctx) => {
  need(confirm === 'DELETE', 'missing delete confirmation');
  const uid = ctx.uid;

  const convs = await db.collection(COL.conversations).where('members', 'array-contains', uid).get();
  const b = bucket();
  await Promise.all([
    b.deleteFiles({ prefix: `users/${uid}/` }),
    b.deleteFiles({ prefix: `posts/${uid}/` }),
    ...convs.docs.map((c) => b.deleteFiles({ prefix: `chat/${c.id}/${uid}/` })),
  ]);

  // 상대가 이미 나간 대화는 내가 마지막이다 → 대화방·메시지·사진을 통째로 지운다.
  // 상대가 남아 있으면 상대의 기록은 두고 대화방만 닫는다.
  const lastOut = convs.docs.filter((c) => {
    const left = (c.get('left') ?? {}) as Record<string, number>;
    return (c.get('members') as string[]).every((m) => m === uid || left[m]);
  });
  const stays = convs.docs.filter((c) => !lastOut.includes(c));
  await Promise.all(
    lastOut.flatMap((c) => [
      db.recursiveDelete(c.ref.collection(COL.messages)),
      b.deleteFiles({ prefix: `chat/${c.id}/` }),
    ]),
  );

  const [pubSnap, privSnap] = await db.getAll(publicRef(uid), privateRef(uid));
  const pub = pubSnap!.data() as UserPublic | undefined;
  const priv = privSnap!.data() as UserPrivate | undefined;

  await db.runTransaction(async (tx) => {
    if (pub?.visible && pub.regionKey) moveRegionStat(tx, pub.regionKey, null);
    for (const c of lastOut) tx.delete(c.ref);
    for (const c of stays) tx.update(c.ref, { closedBy: uid, [`left.${uid}`]: Date.now() });
    if (priv?.phoneHash) tx.set(db.collection(COL.phoneIndex).doc(priv.phoneHash), { uid: null }, { merge: true });
  });

  await Promise.all([
    deleteQuery(db.collection(COL.posts).where('authorUid', '==', uid)),
    deleteQuery(db.collection(COL.likes).where('from', '==', uid)),
    deleteQuery(db.collection(COL.likes).where('to', '==', uid)),
    deleteQuery(db.collection(COL.matches).where('members', 'array-contains', uid)),
    deleteQuery(db.collectionGroup(COL.blockTargets).where('targetUid', '==', uid)),
    deleteQuery(db.collection(COL.locationShares).where('members', 'array-contains', uid)),
    db.recursiveDelete(db.collection(COL.blocks).doc(uid)),
    db.recursiveDelete(publicRef(uid)),
    db.recursiveDelete(privateRef(uid)),
    db.recursiveDelete(walletRef(uid)),
  ]);
  // 내부 문서는 남겨 둔다 (riskScore·정지 사유는 재가입 악용 판단에 쓴다). 개인 식별 정보는 없다.
  await internalRef(uid).set({ deletedAt: Date.now() }, { merge: true });
  await auth.deleteUser(uid);
  return { ok: true };
});
