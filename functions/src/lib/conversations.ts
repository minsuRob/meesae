import type { Transaction } from 'firebase-admin/firestore';

import { COL, type Conversation, type ConversationKind, type Message, type SystemMessageKey } from '../../../shared/models';
import { db } from './admin';

export const conversationRef = (id: string) => db.collection(COL.conversations).doc(id);
export const messagesCol = (id: string) => conversationRef(id).collection(COL.messages);

export function newConversation(
  id: string,
  members: [string, string],
  kind: ConversationKind,
  openedBy: string,
  t: number,
): Conversation {
  return {
    id,
    members: [...members].sort() as [string, string],
    kind,
    openedBy,
    lastMessage: null,
    unread: { [members[0]]: 0, [members[1]]: 0 },
    readAt: {},
    closedBy: null,
    createdAt: t,
    updatedAt: t,
  };
}

/**
 * 시스템 메시지(매치 알림 등)를 남긴다. 문장 대신 키를 저장하고 앱이 번역한다. 대화방 문서에 합칠 요약 필드를 돌려준다
 * (같은 트랜잭션에서 대화방 문서를 두 번 쓰지 않도록 호출자가 한 번에 쓴다).
 */
export function addSystemMessage(
  tx: Transaction,
  conversationId: string,
  systemKey: SystemMessageKey,
  t: number,
): Pick<Conversation, 'lastMessage' | 'updatedAt'> {
  const ref = messagesCol(conversationId).doc();
  const msg: Message = { id: ref.id, senderUid: 'system', type: 'system', text: '', systemKey, imagePath: null, createdAt: t };
  tx.set(ref, msg);
  return { lastMessage: { text: '', senderUid: 'system', type: 'system', systemKey, at: t }, updatedAt: t };
}
