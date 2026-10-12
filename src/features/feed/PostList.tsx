import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, View } from 'react-native';

import type { Post } from '@shared/models';

import { call, toApiError } from '@/firebase/api';
import { queries, refs } from '@/firebase/collections';
import { useDoc, useQuery } from '@/firebase/hooks';
import { useStorageUrl } from '@/firebase/storage';
import { regionName, timeAgo, useT } from '@/i18n';
import { useUid } from '@/store/session';
import { notify } from '@/ui/notify';
import { Avatar, Card, Empty, FAB, Icon, Photo, Press, Row, SkeletonList, Stack, Text } from '@/ui/primitives';
import { radius, space, useColors } from '@/ui/theme';
import { useNow } from '@/ui/useNow';

import { useMyProfile } from '../profile/useMyProfile';

const PAGE = 20;

function PostImage({ path }: { path: string }) {
  const url = useStorageUrl(path);
  return <Photo source={url ? { uri: url } : undefined} aspect={1} style={{ borderRadius: radius.sm }} />;
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
    <Press
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={t('feed.like')}
      accessibilityState={{ selected: liked }}
      haptic="success"
      pressScale={0.9}
      hitSlop={8}
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
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 32 }}
    >
      <Icon name={liked ? 'heart' : 'heart-outline'} size="lg" color={liked ? colors.primary : colors.text} />
      <Text variant="label" tone="muted">
        {post.likeCount}
      </Text>
    </Press>
  );
}

export function PostCard({ post, onOpen }: { post: Post; onOpen: (id: string) => void }) {
  const colors = useColors();
  const avatar = useStorageUrl(post.author.photo);
  const meta = usePostMeta(post);
  return (
    <Card>
      <Stack gap={space.md}>
        <Press
          haptic={false}
          pressScale={1}
          onPress={() => router.push({ pathname: '/profile/[uid]', params: { uid: post.authorUid } })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}
        >
          <Avatar uri={avatar} name={post.author.nickname} verified={post.author.badges.includes('phone')} />
          <Stack gap={0}>
            <Text variant="subtitle">{post.author.nickname}</Text>
            <Text variant="caption">{meta}</Text>
          </Stack>
        </Press>
        <Press onPress={() => onOpen(post.id)} haptic={false} pressScale={1} accessibilityRole="button">
          <Text tone="body" numberOfLines={8}>
            {post.text}
          </Text>
        </Press>
        {post.imagePaths.length ? (
          <Row gap={space.sm}>
            {post.imagePaths.slice(0, 2).map((p) => (
              <View key={p} style={{ flex: 1 }}>
                <PostImage path={p} />
              </View>
            ))}
          </Row>
        ) : null}
        <Row gap={space.xl}>
          <LikeButton post={post} />
          <Press onPress={() => onOpen(post.id)} haptic={false} pressScale={0.9} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Icon name="chatbubble-outline" size="md" color={colors.text} />
            <Text variant="label" tone="muted">
              {post.commentCount}
            </Text>
          </Press>
        </Row>
      </Stack>
    </Card>
  );
}

export function PostList({ onOpen, onCompose }: { onOpen: (id: string) => void; onCompose?: () => void }) {
  const { t } = useT();
  const me = useMyProfile();
  const [n, setN] = useState(PAGE);
  const country = me?.countryCode ?? null;
  const { data, loading, error } = useQuery(me ? queries.feed(country, n) : null, me ? `feed:${country}:${n}` : null);

  if (!me || (loading && !data.length)) return <SkeletonList kind="row" count={4} />;
  if (error) return <Empty icon="alert-circle-outline" title={t('feed.loadFailed')} />;
  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={data}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: space.xxxl * 2 }}
        ListEmptyComponent={<Empty icon="create-outline" title={t('feed.empty')} body={t('feed.emptyBody')} />}
        renderItem={({ item }) => <PostCard post={item} onOpen={onOpen} />}
        onEndReached={() => {
          if (data.length >= n) setN((x) => x + PAGE);
        }}
        onEndReachedThreshold={0.4}
      />
      {onCompose ? (
        <View style={{ position: 'absolute', right: space.lg, bottom: space.lg }}>
          <FAB name="create-outline" label={t('feed.write')} onPress={onCompose} />
        </View>
      ) : null}
    </View>
  );
}
