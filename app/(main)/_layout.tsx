/**
 * 메인 레이아웃. mobile = 하단 탭, desktop(폭 ≥ 768) = 왼쪽 사이드바.
 * 지갑 구독과 필터 복원을 여기서 한 번 건다.
 */

import { Tabs } from 'expo-router';
import { getDoc } from 'firebase/firestore';
import { useEffect } from 'react';

import { refs } from '@/firebase/collections';
import { useT } from '@/i18n';
import { useFilters } from '@/store/filters';
import { useUid } from '@/store/session';
import { subscribeWallet } from '@/store/wallet';
import { NavBar } from '@/ui/layout/NavBar';
import { useLayoutMode } from '@/ui/layout/useLayoutMode';

export default function MainLayout() {
  const mode = useLayoutMode();
  const { t } = useT();
  const uid = useUid();
  const hydrate = useFilters((s) => s.hydrate);

  useEffect(() => {
    subscribeWallet(uid);
    if (!uid) return;
    getDoc(refs.userPrivate(uid))
      .then((snap) => hydrate(snap.data()?.filters))
      .catch(() => hydrate(undefined));
  }, [uid, hydrate]);

  return (
    <Tabs
      screenOptions={{ headerShown: false, tabBarPosition: mode === 'desktop' ? 'left' : 'bottom' }}
      tabBar={(props) => (
        <NavBar
          mode={mode}
          state={props.state}
          navigate={(name) => props.navigation.navigate(name as never)}
        />
      )}
    >
      <Tabs.Screen name="chat" options={{ title: t('nav.chat') }} />
      <Tabs.Screen name="map" options={{ title: t('nav.map') }} />
      <Tabs.Screen name="feed" options={{ title: t('nav.feed') }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
