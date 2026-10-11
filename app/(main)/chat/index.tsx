/**
 * 메뉴 1: 추천 + 대화 목록.
 * desktop 은 왼쪽 목록 | 오른쪽 대화방·프로필 (선택은 URL ?c= / ?p= 로 들고 있는다).
 * mobile 은 목록만 보여 주고 누르면 스택으로 이동한다.
 */

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConversationList } from '@/features/chat/ConversationList';
import { ConversationView } from '@/features/chat/ConversationView';
import { FilterSheet } from '@/features/discover/FilterSheet';
import { ProfileCardView } from '@/features/discover/ProfileCardView';
import { useRecommendations } from '@/features/discover/useRecommendations';
import { MainHeader } from '@/features/profile/MainHeader';
import { ProfileView } from '@/features/profile/ProfileView';
import { useT } from '@/i18n';
import { useFilters } from '@/store/filters';
import { useUid } from '@/store/session';
import { SplitPane } from '@/ui/layout/SplitPane';
import { useLayoutMode } from '@/ui/layout/useLayoutMode';
import { Button, Empty, Icon, Loading, Segmented, Stack } from '@/ui/primitives';
import { space, useColors } from '@/ui/theme';

type Tab = 'discover' | 'chats';

function DiscoverList({ columns, onOpen }: { columns: number; onOpen: (uid: string) => void }) {
  const { t } = useT();
  const filters = useFilters((s) => s.filters);
  const hydrated = useFilters((s) => s.hydrated);
  const rec = useRecommendations(filters, hydrated);

  if (!hydrated || (rec.loading && !rec.items.length)) return <Loading />;
  if (rec.error) {
    return (
      <Empty
        title={rec.errorCode === 'PERK_REQUIRED' ? t('errors.PERK_REQUIRED') : t('discover.loadFailed')}
        body={rec.error}
        action={<Button title={t('common.retry')} small onPress={rec.refresh} />}
      />
    );
  }
  return (
    <FlatList
      key={`cols-${columns}`}
      data={rec.items}
      numColumns={columns}
      keyExtractor={(p) => p.uid}
      contentContainerStyle={{ padding: space.md, gap: space.md }}
      columnWrapperStyle={columns > 1 ? { gap: space.md } : undefined}
      renderItem={({ item }) => (
        <View style={{ flex: 1 / columns }}>
          <ProfileCardView p={item} onLiked={rec.markLiked} onOpen={onOpen} />
        </View>
      )}
      onEndReached={() => rec.hasMore && !rec.loading && rec.loadMore()}
      onEndReachedThreshold={0.5}
      refreshing={rec.loading}
      onRefresh={rec.refresh}
      ListEmptyComponent={<Empty title={t('discover.empty')} body={t('discover.emptyBody')} />}
    />
  );
}

export default function ChatTab() {
  const { t } = useT();
  const colors = useColors();
  const mode = useLayoutMode();
  const params = useLocalSearchParams<{ tab?: Tab; c?: string; p?: string; scope?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'chats' ? 'chats' : 'discover');
  const [filterOpen, setFilterOpen] = useState(false);
  const uid = useUid();
  const filters = useFilters((s) => s.filters);
  const saveFilters = useFilters((s) => s.save);

  // 지도에서 "동네 사람 보기" 로 들어오면 범위를 같은 구로
  useEffect(() => {
    if (params.scope === 'district' && uid && filters.scope !== 'district') {
      void saveFilters(uid, { ...filters, scope: 'district' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.scope, uid]);

  const desktop = mode === 'desktop';
  const openConversation = (id: string) =>
    desktop ? router.setParams({ c: id, p: undefined }) : router.push({ pathname: '/chat/[id]', params: { id } });
  const openProfile = (target: string) =>
    desktop ? router.setParams({ p: target, c: undefined }) : router.push({ pathname: '/profile/[uid]', params: { uid: target } });

  const list = (
    <Stack gap={0} style={{ flex: 1 }}>
      <View style={{ padding: space.md }}>
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'discover', label: t('discover.tabDiscover') },
            { value: 'chats', label: t('discover.tabChats') },
          ]}
        />
      </View>
      {tab === 'discover' ? (
        <DiscoverList columns={desktop ? 1 : 2} onOpen={openProfile} />
      ) : (
        <ConversationList selectedId={params.c} onOpen={openConversation} />
      )}
    </Stack>
  );

  const detail = params.c ? (
    <ConversationView key={params.c} id={params.c} embedded />
  ) : params.p ? (
    <ProfileView key={params.p} uid={params.p} />
  ) : undefined;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <MainHeader
        title={t('chat.title')}
        right={
          tab === 'discover' ? (
            <Pressable onPress={() => setFilterOpen(true)} accessibilityLabel={t('discover.filter')}>
              <Icon name="options-outline" />
            </Pressable>
          ) : null
        }
      />
      <SplitPane
        list={list}
        detail={detail}
        placeholder={<Empty title={t('discover.pickPane')} body={t('discover.pickPaneBody')} />}
      />
      <FilterSheet
        key={filterOpen ? 'open' : 'closed'}
        visible={filterOpen}
        value={filters}
        onClose={() => setFilterOpen(false)}
        onApply={(f) => {
          setFilterOpen(false);
          if (uid) void saveFilters(uid, f);
        }}
      />
    </SafeAreaView>
  );
}
