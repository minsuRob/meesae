/**
 * 탐색·좋아요. 추천 목록은 Functions 만 만들 수 있다 (users_public 은 클라이언트가 목록 조회를 못 한다).
 */

import type { Query } from 'firebase-admin/firestore';

import type { ProfileCard } from '../../../shared/api';
import { dayKey, likeCharge } from '../../../shared/economy';
import { COL, pairId, type Conversation, type UserPrivate, type UserPublic, type Wallet } from '../../../shared/models';
import { distanceBucket, type DistanceBucket } from '../../../shared/region';
import { passesFilters, sanitizeFilters, score, usesExtraFilters } from '../../../shared/score';
import { isRequestId } from '../../../shared/validators';
import { db } from '../lib/admin';
import { addSystemMessage, conversationRef, newConversation } from '../lib/conversations';
import { appError } from '../lib/errors';
import { callable, isUid, need } from '../lib/guard';
import { loadEconomy, runWalletTx } from '../lib/ledger';
import { RATE } from '../lib/rateLimit';
import { blockedSet, isBlockedEither, isBlockedEitherTx, privateRef, publicRef, walletRef } from '../lib/users';

const PAGE_RAW = 60;
const PAGE_OUT = 20;

export const likeRef = (from: string, to: string) => db.collection(COL.likes).doc(`${from}_${to}`);

export function toCard(p: UserPublic, distance: DistanceBucket, likedByMe: boolean): ProfileCard {
  return {
    uid: p.uid,
    nickname: p.nickname,
    age: p.age,
    gender: p.gender,
    photos: p.photos,
    mbti: p.mbti,
    drinking: p.drinking,
    smoking: p.smoking,
    job: p.job,
    school: p.school,
    regionLabel: p.regionLabel,
    regionLabels: p.regionLabels ?? {},
    badges: p.badges,
    distance,
    likedByMe,
    lastActiveAt: p.lastActiveAt ?? null,
  };
}

export const getRecommendations = callable(
  'getRecommendations',
  { action: 'discover.view', rate: RATE.recommend },
  async (req, ctx) => {
    const t = Date.now();
    const [meSnap, privSnap, walletSnap] = await db.getAll(publicRef(ctx.uid), privateRef(ctx.uid), walletRef(ctx.uid));
    const me = meSnap.data() as UserPublic | undefined;
    if (!me) throw appError('NOT_ONBOARDED');
    const priv = privSnap.data() as UserPrivate | undefined;
    const wallet = walletSnap.data() as Wallet | undefined;

    const filters = sanitizeFilters(req.filters ?? priv?.filters);
    const extraAllowed = (wallet?.perks.extraFilters ?? 0) > t;
    if (usesExtraFilters(filters) && !extraAllowed) throw appError('PERK_REQUIRED');

    let q: Query = db.collection(COL.usersPublic).where('visible', '==', true);
    if (filters.scope === 'district' && me.regionKey) q = q.where('regionKey', '==', me.regionKey);
    else if (filters.scope === 'admin1' && me.admin1Key) q = q.where('admin1Key', '==', me.admin1Key);
    else q = q.where('countryCode', '==', me.countryCode);
    if (filters.genders?.length && filters.genders.length < 3) q = q.where('gender', 'in', filters.genders);
    q = q.orderBy('lastActiveAt', 'desc');
    if (typeof req.cursor === 'number') q = q.startAfter(req.cursor);

    const [page, blocked] = await Promise.all([q.limit(PAGE_RAW).get(), blockedSet(ctx.uid)]);
    const candidates = page.docs
      .map((d) => d.data() as UserPublic)
      .filter((p) => p.uid !== ctx.uid && !blocked.has(p.uid) && passesFilters(p, filters, extraAllowed));

    // 이미 좋아요한 사람은 뺀다. 거리는 비공개 좌표로 서버에서만 계산한다.
    const [likeSnaps, privSnaps] = candidates.length
      ? await Promise.all([
          db.getAll(...candidates.map((c) => likeRef(ctx.uid, c.uid))),
          db.getAll(...candidates.map((c) => privateRef(c.uid)), { fieldMask: ['location', 'regionKey'] }),
        ])
      : [[], []];
    const mePlaced = { regionKey: me.regionKey ?? undefined, location: priv?.location ?? undefined };

    const scored = candidates
      .map((p, i) => ({ p, liked: likeSnaps[i]!.exists, other: privSnaps[i]!.data() as Partial<UserPrivate> | undefined }))
      .filter((x) => !x.liked)
      .map(({ p, other }) => {
        const distance = distanceBucket(mePlaced, {
          regionKey: p.regionKey ?? undefined,
          location: other?.location ?? undefined,
        });
        return { card: toCard(p, distance, false), s: score({ profile: p, distance }, me, t) };
      })
      .sort((a, b) => b.s - a.s)
      .slice(0, PAGE_OUT);

    // 내 활동 시각 갱신 (추천 정렬에 쓰인다). 실패해도 목록은 돌려준다.
    publicRef(ctx.uid).update({ lastActiveAt: t }).catch(() => undefined);

    const last = page.docs[page.docs.length - 1];
    return {
      items: scored.map((x) => x.card),
      nextCursor: page.docs.length === PAGE_RAW && last ? (last.get('lastActiveAt') as number) : null,
    };
  },
);

export const getProfile = callable('getProfile', { action: 'discover.view' }, async ({ uid }, ctx) => {
  need(isUid(uid));
  const [targetSnap, meSnap, myPriv, theirPriv, like] = await db.getAll(
    publicRef(uid),
    publicRef(ctx.uid),
    privateRef(ctx.uid),
    privateRef(uid),
    likeRef(ctx.uid, uid),
  );
  const target = targetSnap!.data() as UserPublic | undefined;
  if (!target || (!target.visible && uid !== ctx.uid)) throw appError('NOT_FOUND');
  if (uid !== ctx.uid && (await isBlockedEither(ctx.uid, uid))) throw appError('NOT_FOUND');
  const me = meSnap!.data() as UserPublic | undefined;
  const distance = distanceBucket(
    { regionKey: me?.regionKey ?? undefined, location: (myPriv!.get('location') as UserPrivate['location']) ?? undefined },
    { regionKey: target.regionKey ?? undefined, location: (theirPriv!.get('location') as UserPrivate['location']) ?? undefined },
  );
  return { profile: toCard(target, distance, like!.exists) };
});

export const likeUser = callable('likeUser', { action: 'like.send', rate: RATE.like }, async (req, ctx) => {
  const { targetUid, clientRequestId } = req;
  need(isUid(targetUid) && targetUid !== ctx.uid, 'bad target');
  need(isRequestId(clientRequestId), 'bad clientRequestId');
  const eco = await loadEconomy();

  return runWalletTx(ctx.uid, clientRequestId, async (w, tx) => {
    const convId = pairId(ctx.uid, targetUid);
    const [target, mine, theirs, conv, blocked] = await Promise.all([
      tx.get(publicRef(targetUid)),
      tx.get(likeRef(ctx.uid, targetUid)),
      tx.get(likeRef(targetUid, ctx.uid)),
      tx.get(conversationRef(convId)),
      isBlockedEitherTx(tx, ctx.uid, targetUid),
    ]);
    if (!target.exists || !target.get('visible')) throw appError('NOT_FOUND');
    if (blocked) throw appError('BLOCKED');
    if (mine.exists) throw appError('ALREADY_LIKED');

    const today = dayKey(w.t, eco.DAY_RESET_UTC_OFFSET_MIN);
    const superLike = req.superLike === true;
    let charged = 0;
    let free = true;
    if (superLike) {
      const left = w.wallet.inventory.superLike ?? 0;
      if (left <= 0) throw appError('NO_SUPER_LIKE');
      w.patch({ inventory: { ...w.wallet.inventory, superLike: left - 1 } });
    } else {
      const charge = likeCharge(w.wallet.dailyLikes, today, eco);
      w.charge(charge.cost, 'like', targetUid);
      charged = charge.cost;
      free = charge.free;
    }
    const used = w.wallet.dailyLikes.date === today ? w.wallet.dailyLikes.count : 0;
    w.patch({ dailyLikes: { date: today, count: used + 1 } });

    tx.set(likeRef(ctx.uid, targetUid), { from: ctx.uid, to: targetUid, superLike, createdAt: w.t });

    let matched = false;
    let conversationId: string | null = null;
    if (theirs.exists) {
      matched = true;
      conversationId = convId;
      tx.set(db.collection(COL.matches).doc(convId), {
        id: convId,
        members: [ctx.uid, targetUid].sort(),
        createdAt: w.t,
      });
      const summary = addSystemMessage(tx, convId, 'matched', w.t);
      if (conv.exists) {
        tx.update(conversationRef(convId), { kind: 'match' satisfies Conversation['kind'], ...summary });
      } else {
        tx.set(conversationRef(convId), {
          ...newConversation(convId, [ctx.uid, targetUid], 'match', ctx.uid, w.t),
          ...summary,
        });
      }
    }
    return { balance: w.balance, charged, free, matched, conversationId };
  });
});
