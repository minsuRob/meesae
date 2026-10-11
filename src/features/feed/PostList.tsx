import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import type { Post } from '@shared/models';

import { call, toApiError } from '@/firebase/api';
import { queries, refs } from '@/firebase/collections';
import { useDoc, useQuery } from '@/firebase/hooks';
import { useStorageUrl } from '@/firebase/storage';
import { regionName, timeAgo, useT } from '@/i18n';
import { useUid } from '@/store/session';
import { notify } from '@/ui/notify';
import { Avatar, Button, Card, Empty, Icon, Loading, Photo, Row, Stack, Text } from '@/ui/primitives';
import { space, useColors } from '@/ui/theme';
import { useNow } from '@/ui/useNow';

import { useMyProfile } from '../profile/useMyProfile';

const PAGE = 20;

function PostImage({ path }: { path: string }) {
  const url = useStorageUrl(path);
  return <Photo source={url ? { uri: url } : undefined} aspect={1} />;
}

/** 작성자 지역 · 몇 분 전 */
export function usePostMeta(post: Post): string {
  const { t, locale } = useT();
  const now = useNow(60_000);
  const region = regionName(post.author.regionLabels, post.author.regionLabel, locale);
  return [region, timeAgo(post.createdAt, now, t)].filter(Boolean).join(' · ');
}

export function LikeButton({ post }: { post: Post }) {
  const colors = useColors();
  const { t } = useT();
  const uid = useUid();
  const liked = useDoc(uid ? refs.postLike(post.id, uid) : null).data != null;
  const [busy, setBusy] = useState(false);
  return (
    <Pressable
      disabled={busy}
      accessibilityLabel={t('feed.like')}
      onPress={async () => {
        setBusy(true);
        try {
          await call('likePost', { postId: post.id });
        } catch (e) {
          notify(toApiError(e).message);
        } finally {
          setBusy(false);
        }
      }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
    >
      <Icon name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? colors.primary : colors.textMuted} />
      <Text variant="caption">{post.likeCount}</Text>
    </Pressable>
  );
}

export function PostCard({ post, onOpen }: { post: Post; onOpen: (id: string) => void }) {
  const colors = useColors();
  const avatar = useStorageUrl(post.author.photo);
  const meta = usePostMeta(post);
  return (
    <Card onPress={() => onOpen(post.id)}>
      <Stack gap={space.md}>
        <Pressable onPress={() => router.push({ pathname: '/profile/[uid]', params: { uid: post.authorUid } })}>
          <Row gap={space.sm}>
            <Avatar uri={avatar} name={post.author.nickname} size={36} />
            <Stack gap={0}>
              <Row gap={4}>
                <Text variant="label">{post.author.nickname}</Text>
                {post.author.badges.includes('phone') ? <Icon name="checkmark-circle" size={14} color={colors.verified} /> : null}
              </Row>
              <Text variant="caption">{meta}</Text>
            </Stack>
          </Row>
        </Pressable>
        <Text numberOfLines={8}>{post.text}</Text>
        {post.imagePaths.length ? (
          <Row gap={space.sm}>
            {post.imagePaths.slice(0, 2).map((p) => (
              <View key={p} style={{ flex: 1 }}>
                <PostImage path={p} />
              </View>
            ))}
          </Row>
        ) : null}
        <Row gap={space.lg}>
          <LikeButton post={post} />
          <Row gap={4}>
            <Icon name="chatbubble-outline" size={18} color={colors.textMuted} />
            <Text variant="caption">{post.commentCount}</Text>
          </Row>
        </Row>
      </Stack>
    </Card>
  );
}

export function PostList({ onOpen, onCompose }: { onOpen: (id: string) => void; onCompose: () => void }) {
  const { t } = useT();
  const me = useMyProfile();
  const [n, setN] = useState(PAGE);
  const country = me?.countryCode ?? null;
  const { data, loading, error } = useQuery(me ? queries.feed(country, n) : null, me ? `feed:${country}:${n}` : null);

  if (!me || (loading && !data.length)) return <Loading />;
  if (error) return <Empty title={t('feed.loadFailed')} />;
  return (
    <FlatList
      data={data}
      keyExtractor={(p) => p.id}
      contentContainerStyle={{ padding: space.lg, gap: space.md }}
      ListHeaderComponent={<Button title={t('feed.write')} onPress={onCompose} style={{ marginBottom: space.sm }} />}
      ListEmptyComponent={<Empty title={t('feed.empty')} body={t('feed.emptyBody')} />}
      renderItem={({ item }) => <PostCard post={item} onOpen={onOpen} />}
      onEndReached={() => {
        if (data.length >= n) setN((x) => x + PAGE);
      }}
      onEndReachedThreshold={0.4}
    />
  );
}
