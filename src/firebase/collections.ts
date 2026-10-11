/**
 * 컬렉션 경로와 타입 붙인 참조. 클라이언트는 읽기만 한다 (users_private 의 설정 필드 제외).
 */

import {
  collection,
  doc,
  limit,
  orderBy,
  query,
  where,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
  type FirestoreDataConverter,
  type Query,
} from 'firebase/firestore';

import {
  COL,
  type Comment,
  type Conversation,
  type LedgerEntry,
  type LocationShare,
  type Message,
  type Post,
  type UserPrivate,
  type UserPublic,
  type Wallet,
} from '@shared/models';

import { db } from './config';

function converter<T>(): FirestoreDataConverter<T> {
  return {
    toFirestore: (v) => v as DocumentData,
    fromFirestore: (snap) => ({ id: snap.id, ...snap.data() }) as T,
  };
}

const typedDoc = <T>(path: string, ...segments: string[]) =>
  doc(db(), path, ...segments).withConverter(converter<T>()) as DocumentReference<T>;
const typedCol = <T>(path: string, ...segments: string[]) =>
  collection(db(), path, ...segments).withConverter(converter<T>()) as CollectionReference<T>;

export const refs = {
  userPublic: (uid: string) => typedDoc<UserPublic>(COL.usersPublic, uid),
  userPrivate: (uid: string) => typedDoc<UserPrivate>(COL.usersPrivate, uid),
  wallet: (uid: string) => typedDoc<Wallet>(COL.wallets, uid),
  conversation: (id: string) => typedDoc<Conversation>(COL.conversations, id),
  post: (id: string) => typedDoc<Post>(COL.posts, id),
  postLike: (postId: string, uid: string) => typedDoc<{ uid: string }>(COL.posts, postId, COL.postLikes, uid),
  share: (id: string) => typedDoc<LocationShare>(COL.locationShares, id),
  economy: () => typedDoc<Record<string, number>>(COL.config, 'economy'),
};

export const queries = {
  myConversations: (uid: string): Query<Conversation> =>
    query(typedCol<Conversation>(COL.conversations), where('members', 'array-contains', uid), orderBy('updatedAt', 'desc'), limit(100)),
  recentMessages: (convId: string, n: number): Query<Message> =>
    query(typedCol<Message>(COL.conversations, convId, COL.messages), orderBy('createdAt', 'desc'), limit(n)),
  feed: (countryCode: string | null, n: number): Query<Post> =>
    countryCode
      ? query(
          typedCol<Post>(COL.posts),
          where('status', '==', 'visible'),
          where('countryCode', '==', countryCode),
          orderBy('createdAt', 'desc'),
          limit(n),
        )
      : query(typedCol<Post>(COL.posts), where('status', '==', 'visible'), orderBy('createdAt', 'desc'), limit(n)),
  comments: (postId: string): Query<Comment> =>
    query(typedCol<Comment>(COL.posts, postId, COL.comments), orderBy('createdAt', 'asc'), limit(200)),
  ledger: (uid: string): Query<LedgerEntry & { id: string }> =>
    query(typedCol<LedgerEntry & { id: string }>(COL.wallets, uid, COL.ledger), orderBy('createdAt', 'desc'), limit(50)),
  activeShares: (uid: string, nowMs: number): Query<LocationShare> =>
    query(
      typedCol<LocationShare>(COL.locationShares),
      where('members', 'array-contains', uid),
      where('expiresAt', '>', nowMs),
      orderBy('expiresAt', 'desc'),
      limit(10),
    ),
};
