import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import type { Post } from '@shared/models';
import { LIMITS } from '@shared/validators';

import { call, newRequestId, toApiError } from '@/firebase/api';
import { queries, refs } from '@/firebase/collections';
import { useDoc, useQuery } from '@/firebase/hooks';
import { useStorageUrl } from '@/firebase/storage';
import { timeAgo, useT } from '@/i18n';
import { useClaims, useUid } from '@/store/session';
import { KeyboardAvoid, KeyboardScrollView } from '@/ui/keyboard';
import { confirm, notify } from '@/ui/notify';
import { Avatar, Button, Divider, Empty, HeaderBar, IconButton, Input, Loading, Photo, Row, Stack, Text } from '@/ui/primitives';
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
    <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
      <Avatar uri={avatar} name={nickname} size="sm" />
      <Stack gap={space.xxs} style={{ flex: 1 }}>
        <Row gap={space.sm}>
          <Text variant="label" style={{ fontWeight: '600' }}>
            {nickname}
          </Text>
          <Text variant="caption" tone="faint">
            {timeAgo(at, now, t)}
          </Text>
        </Row>
        <Text variant="bodySm" tone="body">
          {text}
        </Text>
      </Stack>
    </Row>
  );
}

export function PostDetail({ id, embedded }: { id: string; embedded?: boolean }) {
  const { t } = useT();
  const post = useDoc(refs.post(id));
  if (post.loading) return <Loading />;
  if (!post.data) return <Empty icon="document-outline" title={t('feed.notFound')} />;
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
    <KeyboardAvoid style={{ flex: 1, backgroundColor: colors.bg }}>
      <HeaderBar
        title={t('feed.post')}
        center={!embedded}
        onBack={embedded ? undefined : () => router.back()}
        backLabel={t('common.back')}
        right={
          mine ? (
            <IconButton name="trash-outline" label={t('common.delete')} variant="ghost" onPress={remove} />
          ) : (
            <IconButton name="flag-outline" label={t('common.report')} variant="ghost" onPress={report} />
          )
        }
      />
      <KeyboardScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.lg, gap: space.lg, maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' }}
      >
        <Row gap={space.md}>
          <Avatar uri={avatar} name={p.author.nickname} verified={p.author.badges.includes('phone')} />
          <Stack gap={0} style={{ flex: 1 }}>
            <Text variant="subtitle">{p.author.nickname}</Text>
            <Text variant="caption">{meta}</Text>
          </Stack>
        </Row>
        <Text tone="body">{p.text}</Text>
        {p.imagePaths.map((path) => (
          <PostImage key={path} path={path} />
        ))}
        <LikeButton post={p} />
        <Divider />
        <Text variant="heading">{t('feed.comments', { n: p.commentCount })}</Text>
        <Stack gap={space.lg}>
          {comments.data.map((c) => (
            <CommentRow key={c.id} nickname={c.author.nickname} photo={c.author.photo} text={c.text} at={c.createdAt} />
          ))}
        </Stack>
        <Text variant="caption" tone="faint">
          {t('feed.noContacts')}
        </Text>
      </KeyboardScrollView>
      <View style={{ borderTopWidth: 1, borderTopColor: colors.hairline, backgroundColor: colors.surface, padding: space.md }}>
        <Row gap={space.sm} style={{ alignItems: 'flex-end', maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' }}>
          <Stack style={{ flex: 1 }}>
            <Input value={text} onChangeText={setText} placeholder={t('feed.commentPlaceholder')} maxLength={LIMITS.COMMENT_MAX} />
          </Stack>
          <Button title={t('feed.submitComment')} onPress={comment} loading={busy} disabled={!text.trim()} />
        </Row>
      </View>
    </KeyboardAvoid>
  );
}
