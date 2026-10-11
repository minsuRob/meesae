/**
 * 게시물 피드. 작성자 정보는 글을 쓸 때의 스냅샷으로 함께 저장한다
 * (피드를 그리려고 users_public 을 목록 조회할 필요가 없게).
 */

import { FieldValue } from 'firebase-admin/firestore';

import { COL, type Comment, type Post, type UserPublic } from '../../../shared/models';
import { checkComment, checkPost, isRequestId, LIMITS } from '../../../shared/validators';
import { bucket, db } from '../lib/admin';
import { appError, invalid } from '../lib/errors';
import { callable, isDocId, need } from '../lib/guard';
import { RATE } from '../lib/rateLimit';
import { publicRef } from '../lib/users';

const postRef = (id: string) => db.collection(COL.posts).doc(id);

export const createPost = callable('createPost', { action: 'post.create', rate: RATE.post }, async (req, ctx) => {
  need(isRequestId(req.clientRequestId), 'bad clientRequestId');
  const r = checkPost(req.text);
  if (!r.ok) throw invalid(r.issue);
  const images = req.imagePaths ?? [];
  need(Array.isArray(images) && images.length <= LIMITS.POST_IMAGES_MAX, 'too many images');
  for (const p of images) {
    need(typeof p === 'string' && p.startsWith(`posts/${ctx.uid}/`) && !p.includes('..'), 'bad photo path');
  }
  const exists = await Promise.all(images.map((p) => bucket().file(p).exists()));
  if (exists.some(([ok]) => !ok)) throw appError('PHOTO_MISSING');

  const me = (await publicRef(ctx.uid).get()).data() as UserPublic | undefined;
  if (!me) throw appError('NOT_ONBOARDED');

  // 멱등: 같은 요청 ID 면 같은 문서
  const ref = postRef(`${ctx.uid}_${req.clientRequestId}`);
  const post: Post = {
    id: ref.id,
    authorUid: ctx.uid,
    author: {
      nickname: me.nickname,
      photo: me.photos[0] ?? null,
      badges: me.badges,
      regionLabel: me.regionLabel,
      regionLabels: me.regionLabels ?? {},
    },
    text: r.value,
    imagePaths: images,
    countryCode: me.countryCode,
    likeCount: 0,
    commentCount: 0,
    status: 'visible',
    createdAt: Date.now(),
  };
  await ref.create(post).catch((e: { code?: number }) => {
    if (e.code !== 6) throw e; // 6 = ALREADY_EXISTS → 재시도
  });
  return { postId: ref.id };
});

export const likePost = callable('likePost', { action: 'post.interact', rate: RATE.like }, async ({ postId }, ctx) => {
  need(isDocId(postId));
  const ref = postRef(postId);
  const likeDoc = ref.collection(COL.postLikes).doc(ctx.uid);
  return db.runTransaction(async (tx) => {
    const [post, like] = await Promise.all([tx.get(ref), tx.get(likeDoc)]);
    if (!post.exists || post.get('status') !== 'visible') throw appError('NOT_FOUND');
    const count = post.get('likeCount') as number;
    if (like.exists) {
      tx.delete(likeDoc);
      tx.update(ref, { likeCount: FieldValue.increment(-1) });
      return { liked: false, likeCount: Math.max(0, count - 1) };
    }
    tx.set(likeDoc, { uid: ctx.uid, createdAt: Date.now() });
    tx.update(ref, { likeCount: FieldValue.increment(1) });
    return { liked: true, likeCount: count + 1 };
  });
});

export const commentPost = callable(
  'commentPost',
  { action: 'post.interact', rate: RATE.comment },
  async ({ postId, text, clientRequestId }, ctx) => {
    need(isDocId(postId));
    need(isRequestId(clientRequestId), 'bad clientRequestId');
    const r = checkComment(text);
    if (!r.ok) throw invalid(r.issue);
    const me = (await publicRef(ctx.uid).get()).data() as UserPublic | undefined;
    if (!me) throw appError('NOT_ONBOARDED');

    const ref = postRef(postId);
    const commentRef = ref.collection(COL.comments).doc(`${ctx.uid}_${clientRequestId}`);
    await db.runTransaction(async (tx) => {
      const [post, existing] = await Promise.all([tx.get(ref), tx.get(commentRef)]);
      if (!post.exists || post.get('status') !== 'visible') throw appError('NOT_FOUND');
      if (existing.exists) return;
      const c: Comment = {
        id: commentRef.id,
        authorUid: ctx.uid,
        author: { nickname: me.nickname, photo: me.photos[0] ?? null },
        text: r.value,
        createdAt: Date.now(),
      };
      tx.set(commentRef, c);
      tx.update(ref, { commentCount: FieldValue.increment(1) });
    });
    return { commentId: commentRef.id };
  },
);

export const deletePost = callable('deletePost', { action: 'post.interact' }, async ({ postId }, ctx) => {
  need(isDocId(postId));
  const ref = postRef(postId);
  const snap = await ref.get();
  if (!snap.exists) throw appError('NOT_FOUND');
  const post = snap.data() as Post;
  if (post.authorUid !== ctx.uid && ctx.claims.role !== 'admin') throw appError('NOT_FOUND');
  await Promise.all(post.imagePaths.map((p) => bucket().file(p).delete({ ignoreNotFound: true })));
  await db.recursiveDelete(ref);
  return { ok: true };
});
