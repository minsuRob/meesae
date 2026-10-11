/**
 * 실시간 위치공유. 휴대폰 인증한 사람만 시작할 수 있고, 만료되면 Rules 가 읽기를 막는다.
 * 좌표는 공유 문서 안에만 있고 공유가 끝나면 스케줄러가 문서를 지운다.
 */

import { COL, type Conversation, type LocationShare } from '../../../shared/models';
import { isValidLatLng } from '../../../shared/region';
import { db } from '../lib/admin';
import { conversationRef } from '../lib/conversations';
import { appError } from '../lib/errors';
import { callable, isDocId, need } from '../lib/guard';
import { RATE } from '../lib/rateLimit';

export const SHARE_MINUTES = [15, 30, 60] as const;

const shareRef = (id: string) => db.collection(COL.locationShares).doc(id);

export const startLocationShare = callable(
  'startLocationShare',
  { action: 'location.liveShare', rate: RATE.shareUpdate },
  async (req, ctx) => {
    need(isDocId(req.conversationId));
    need((SHARE_MINUTES as readonly number[]).includes(req.minutes), 'bad share minutes');
    const p = { lat: req.lat, lng: req.lng };
    need(isValidLatLng(p), 'bad coordinates');

    const conv = (await conversationRef(req.conversationId).get()).data() as Conversation | undefined;
    if (!conv || !conv.members.includes(ctx.uid)) throw appError('NOT_FOUND');
    if (conv.closedBy) throw appError('CONVERSATION_CLOSED');

    const t = Date.now();
    const ref = db.collection(COL.locationShares).doc();
    const share: LocationShare = {
      id: ref.id,
      conversationId: conv.id,
      members: conv.members,
      startedBy: ctx.uid,
      positions: { [ctx.uid]: { ...p, at: t } },
      expiresAt: t + req.minutes * 60_000,
      createdAt: t,
    };
    await ref.set(share);
    return { shareId: ref.id, expiresAt: share.expiresAt };
  },
);

export const updateSharedLocation = callable(
  'updateSharedLocation',
  { action: 'location.liveShare', rate: RATE.shareUpdate },
  async (req, ctx) => {
    need(isDocId(req.shareId));
    const p = { lat: req.lat, lng: req.lng };
    need(isValidLatLng(p), 'bad coordinates');
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(shareRef(req.shareId));
      const s = snap.data() as LocationShare | undefined;
      if (!s || !s.members.includes(ctx.uid)) throw appError('NOT_FOUND');
      if (s.expiresAt <= Date.now()) throw appError('SHARE_ENDED');
      tx.update(snap.ref, { [`positions.${ctx.uid}`]: { ...p, at: Date.now() } });
    });
    return { ok: true };
  },
);

/** 공유 종료는 인증 여부와 상관없이 참여자 누구나 할 수 있다 */
export const stopLocationShare = callable('stopLocationShare', {}, async (req, ctx) => {
  need(isDocId(req.shareId));
  const snap = await shareRef(req.shareId).get();
  const s = snap.data() as LocationShare | undefined;
  if (!s || !s.members.includes(ctx.uid)) throw appError('NOT_FOUND');
  await snap.ref.update({ expiresAt: Date.now(), positions: {} });
  return { ok: true };
});
