/**
 * 채팅. 메시지는 전부 서버가 쓴다 → 발신자 위조·차단 후 전송·이미지 권한 우회가 불가능하다.
 */

import { FieldValue } from 'firebase-admin/firestore';

import { introCharge } from '../../../shared/economy';
import { pairId, type Conversation, type Message, type MessageType } from '../../../shared/models';
import { checkMessage, isRequestId } from '../../../shared/validators';
import { bucket, db } from '../lib/admin';
import { conversationRef, messagesCol, newConversation } from '../lib/conversations';
import { appError, invalid } from '../lib/errors';
import { callable, isDocId, isUid, need, type Ctx } from '../lib/guard';
import { loadEconomy, runWalletTx } from '../lib/ledger';
import { RATE } from '../lib/rateLimit';
import { isBlockedEitherTx, publicRef } from '../lib/users';

export const startConversation = callable(
  'startConversation',
  { action: 'chat.start', rate: RATE.intro },
  async ({ targetUid, clientRequestId }, ctx) => {
    need(isUid(targetUid) && targetUid !== ctx.uid, 'bad target');
    need(isRequestId(clientRequestId), 'bad clientRequestId');
    const eco = await loadEconomy();

    return runWalletTx(ctx.uid, clientRequestId, async (w, tx) => {
      const id = pairId(ctx.uid, targetUid);
      const [conv, target, blocked] = await Promise.all([
        tx.get(conversationRef(id)),
        tx.get(publicRef(targetUid)),
        isBlockedEitherTx(tx, ctx.uid, targetUid),
      ]);
      if (blocked) throw appError('BLOCKED');
      if (conv.exists) {
        const c = conv.data() as Conversation;
        if (c.closedBy) throw appError('CONVERSATION_CLOSED');
        return { balance: w.balance, charged: 0, free: true, conversationId: id, kind: c.kind, existed: true };
      }
      if (!target.exists || !target.get('visible')) throw appError('NOT_FOUND');

      const charge = introCharge(w.wallet.freeIntrosUsed, eco);
      if (charge.free) w.patch({ freeIntrosUsed: w.wallet.freeIntrosUsed + 1 });
      else w.charge(charge.cost, 'intro', targetUid);

      tx.set(conversationRef(id), newConversation(id, [ctx.uid, targetUid], 'intro', ctx.uid, w.t));
      return {
        balance: w.balance,
        charged: charge.cost,
        free: charge.free,
        conversationId: id,
        kind: 'intro' as const,
        existed: false,
      };
    });
  },
);

/** 메시지 한 건을 쓰고 대화방 요약·안 읽음 수를 갱신한다. clientRequestId 를 메시지 ID 로 써서 재전송 중복을 막는다 */
async function writeMessage(
  ctx: Ctx,
  conversationId: string,
  clientRequestId: string,
  type: MessageType,
  text: string,
  imagePath: string | null,
): Promise<{ messageId: string }> {
  const convRef = conversationRef(conversationId);
  const msgRef = messagesCol(conversationId).doc(`${ctx.uid}_${clientRequestId}`);
  await db.runTransaction(async (tx) => {
    const [convSnap, existing] = await Promise.all([tx.get(convRef), tx.get(msgRef)]);
    if (!convSnap.exists) throw appError('NOT_FOUND');
    const conv = convSnap.data() as Conversation;
    if (!conv.members.includes(ctx.uid)) throw appError('NOT_FOUND');
    if (existing.exists) return;
    if (conv.closedBy) throw appError('CONVERSATION_CLOSED');
    const other = conv.members.find((m) => m !== ctx.uid)!;
    if (await isBlockedEitherTx(tx, ctx.uid, other)) throw appError('BLOCKED');

    const t = Date.now();
    const msg: Message = { id: msgRef.id, senderUid: ctx.uid, type, text, imagePath, createdAt: t };
    tx.set(msgRef, msg);
    tx.update(convRef, {
      // 사진은 글자 없이 type 만 남긴다 (앱이 '사진' / 'Photo' 로 보여 준다)
      lastMessage: { text: type === 'image' ? '' : text.slice(0, 100), senderUid: ctx.uid, type, at: t },
      [`unread.${other}`]: FieldValue.increment(1),
      [`unread.${ctx.uid}`]: 0,
      [`readAt.${ctx.uid}`]: t,
      updatedAt: t,
    });
  });
  return { messageId: msgRef.id };
}

export const sendMessage = callable('sendMessage', { action: 'chat.sendText', rate: RATE.message }, async (req, ctx) => {
  need(isDocId(req.conversationId));
  need(isRequestId(req.clientRequestId), 'bad clientRequestId');
  const r = checkMessage(req.text);
  if (!r.ok) throw invalid(r.issue);
  return writeMessage(ctx, req.conversationId, req.clientRequestId, 'text', r.value, null);
});

/**
 * 사진 메시지. 앱이 Storage `chat/{convId}/{uid}/...` 에 먼저 올리고 이 함수로 확정한다.
 * Storage Rules 도 phoneVerified 를 보지만, 여기서 한 번 더 막는다.
 */
export const finalizeChatImage = callable(
  'finalizeChatImage',
  { action: 'chat.sendImage', rate: RATE.message },
  async (req, ctx) => {
    need(isDocId(req.conversationId));
    need(isRequestId(req.clientRequestId), 'bad clientRequestId');
    const prefix = `chat/${req.conversationId}/${ctx.uid}/`;
    need(
      typeof req.path === 'string' && req.path.startsWith(prefix) && !req.path.includes('..'),
      'bad photo path',
    );
    const [exists] = await bucket().file(req.path).exists();
    if (!exists) throw appError('PHOTO_MISSING');
    return writeMessage(ctx, req.conversationId, req.clientRequestId, 'image', '', req.path);
  },
);

export const markConversationRead = callable('markConversationRead', { action: 'chat.sendText' }, async (req, ctx) => {
  need(isDocId(req.conversationId));
  const ref = conversationRef(req.conversationId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || !(snap.get('members') as string[]).includes(ctx.uid)) throw appError('NOT_FOUND');
    tx.update(ref, { [`unread.${ctx.uid}`]: 0, [`readAt.${ctx.uid}`]: Date.now() });
  });
  return { ok: true };
});
