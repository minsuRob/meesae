import { router } from 'expo-router';
import { useState } from 'react';

import type { Post } from '@shared/models';
import { LIMITS } from '@shared/validators';

import { call, newRequestId, toApiError } from '@/firebase/api';
import { queries, refs } from '@/firebase/collections';
import { useDoc, useQuery } from '@/firebase/hooks';
import { useStorageUrl } from '@/firebase/storage';
import { timeAgo, useT } from '@/i18n';
import { useClaims, useUid } from '@/store/session';
import { KeyboardScrollView } from '@/ui/keyboard';
import { confirm, notify } from '@/ui/notify';
import { Avatar, Button, Divider, Empty, Input, Loading, Photo, Row, Stack, Text } from '@/ui/primitives';
import { layout, space, useColors } from '@/ui/theme';
import { useNow } from '@/ui/useNow';

import { LikeButton, usePostMeta } from './PostList';

function PostImage({ path }: { path: string }) {
  const url = useStorageUrl(path);
  return <Photo source={url ? { uri: url } : undefined} aspect={1} />;
}

function CommentRow({ nickname, photo, text, at }: { nickname: string; photo: string | null; text: string; at: number }) {
  const { t } = useT();
  const now = useNow(60_000);
  const avatar = useStorageUrl(photo);
  return (
    <Row gap={space.sm} style={{ alignItems: 'flex-start' }}>
      <Avatar uri={avatar} name={nickname} size={28} />
      <Stack gap={2} style={{ flex: 1 }}>
        <Row gap={space.sm}>
          <Text variant="label">{nickname}</Text>
          <Text variant="caption">{timeAgo(at, now, t)}</Text>
        </Row>
        <Text>{text}</Text>
      </Stack>
    </Row>
  );
}

export function PostDetail({ id, embedded }: { id: string; embedded?: boolean }) {
  const { t } = useT();
  const post = useDoc(refs.post(id));
  if (post.loading) return <Loading />;
  if (!post.data) return <Empty title={t('feed.notFound')} />;
  return <PostBody post={post.data} embedded={embedded} />;
}

function PostBody({ post: p, embedded }: { post: Post; embedded?: boolean }) {
  const colors = useColors();
  const { t } = useT();
  const uid = useUid();
  const claims = useClaims();
  const comments = useQuery(queries.comments(p.id), `comments:${p.id}`);
  const avatar = useStorageUrl(p.author.photo);
  const meta = usePostMeta(p);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const mine = p.authorUid === uid || claims.role === 'admin';

  async function comment() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await call('commentPost', { postId: p.id, text, clientRequestId: newRequestId() });
      setText('');
    } catch (e) {
      notify(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!(await confirm(t('feed.deleteTitle'), t('feed.deleteBody'), t('common.delete')))) return;
    try {
      await call('deletePost', { postId: p.id });
      if (!embedded && router.canGoBack()) router.back();
    } catch (e) {
      notify(toApiError(e).message);
    }
  }

  async function report() {
    if (!(await confirm(t('feed.reportTitle'), undefined, t('common.report')))) return;
    try {
      await call('reportUser', { targetUid: p.authorUid, reason: 'other', refPath: `posts/${p.id}` });
      notify(t('chat.reportDone'), t('chat.reportDoneBody'));
    } catch (e) {
      notify(toApiError(e).message);
    }
  }

  return (
    <KeyboardScrollView
      style={{ backgroundColor: colors.bg }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: space.lg, gap: space.lg, maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' }}
    >
      {!embedded ? <Button title={t('feed.backToFeed')} kind="ghost" small onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} /> : null}
      <Row gap={space.sm}>
        <Avatar uri={avatar} name={p.author.nickname} />
        <Stack gap={0} style={{ flex: 1 }}>
          <Text variant="label">{p.author.nickname}</Text>
          <Text variant="caption">{meta}</Text>
        </Stack>
        {mine ? (
          <Button title={t('common.delete')} kind="ghost" small onPress={remove} />
        ) : (
          <Button title={t('common.report')} kind="ghost" small onPress={report} />
        )}
      </Row>
      <Text>{p.text}</Text>
      {p.imagePaths.map((path) => (
        <PostImage key={path} path={path} />
      ))}
      <LikeButton post={p} />
      <Divider />
      <Text variant="label">{t('feed.comments', { n: p.commentCount })}</Text>
      <Stack gap={space.md}>
        {comments.data.map((c) => (
          <CommentRow key={c.id} nickname={c.author.nickname} photo={c.author.photo} text={c.text} at={c.createdAt} />
        ))}
      </Stack>
      <Row gap={space.sm} style={{ alignItems: 'flex-end' }}>
        <Stack style={{ flex: 1 }}>
          <Input value={text} onChangeText={setText} placeholder={t('feed.commentPlaceholder')} maxLength={LIMITS.COMMENT_MAX} />
        </Stack>
        <Button title={t('feed.submitComment')} small onPress={comment} loading={busy} disabled={!text.trim()} />
      </Row>
      <Text variant="caption">{t('feed.noContacts')}</Text>
    </KeyboardScrollView>
  );
}
