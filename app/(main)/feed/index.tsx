/**
 * 메뉴 3: 게시물 피드 + 포인트 허브 (세그먼트).
 * desktop 은 피드 목록 | 글 상세 2패널.
 */

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PostComposer } from '@/features/feed/PostComposer';
import { PostDetail } from '@/features/feed/PostDetail';
import { PostList } from '@/features/feed/PostList';
import { PointsHub } from '@/features/points/PointsHub';
import { MainHeader } from '@/features/profile/MainHeader';
import { useT } from '@/i18n';
import { SplitPane } from '@/ui/layout/SplitPane';
import { useLayoutMode } from '@/ui/layout/useLayoutMode';
import { Empty, Segmented } from '@/ui/primitives';
import { space, useColors } from '@/ui/theme';

type Tab = 'feed' | 'points';

export default function FeedTab() {
  const colors = useColors();
  const { t } = useT();
  const mode = useLayoutMode();
  const params = useLocalSearchParams<{ tab?: Tab; post?: string }>();
  // 탭은 URL 이 들고 있다 (헤더 포인트 버튼이 ?tab=points 로 연다)
  const tab: Tab = params.tab === 'points' ? 'points' : 'feed';
  const [composing, setComposing] = useState(false);

  const desktop = mode === 'desktop';
  const openPost = (id: string) =>
    desktop ? router.setParams({ post: id }) : router.push({ pathname: '/feed/[postId]', params: { postId: id } });

  const segment = (
    <View style={{ padding: space.md }}>
      <Segmented<Tab>
        value={tab}
        onChange={(next) => router.setParams({ tab: next })}
        options={[
          { value: 'feed', label: t('feed.tabFeed') },
          { value: 'points', label: t('feed.tabPoints') },
        ]}
      />
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <MainHeader title={tab === 'feed' ? t('feed.title') : t('points.title')} />
      {tab === 'points' ? (
        <View style={{ flex: 1 }}>
          {segment}
          <PointsHub />
        </View>
      ) : (
        <SplitPane
          list={
            <View style={{ flex: 1 }}>
              {segment}
              <PostList onOpen={openPost} onCompose={() => setComposing(true)} />
            </View>
          }
          detail={params.post ? <PostDetail key={params.post} id={params.post} embedded /> : undefined}
          placeholder={<Empty title={t('feed.pickPost')} />}
        />
      )}
      <PostComposer
        visible={composing}
        onClose={() => setComposing(false)}
        onPosted={(id) => {
          setComposing(false);
          openPost(id);
        }}
      />
    </SafeAreaView>
  );
}
