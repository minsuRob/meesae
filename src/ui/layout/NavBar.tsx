/**
 * 메인 내비게이션. desktop = 왼쪽 사이드바(메뉴 3개 + 아래 프로필), mobile = 하단 탭.
 * expo-router Tabs 의 tabBar 로 끼운다.
 */

import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMyProfile } from '@/features/profile/useMyProfile';
import { useStorageUrl } from '@/firebase/storage';
import { useT, type MessageKey } from '@/i18n';
import { useBalance } from '@/store/wallet';

import { Avatar, Icon, Row, Stack, Text, type IconName } from '../primitives';
import { layout, radius, space, useColors } from '../theme';
import type { LayoutMode } from './useLayoutMode';

export const MENU: { name: string; label: MessageKey; icon: IconName; iconOn: IconName }[] = [
  { name: 'chat', label: 'nav.chat', icon: 'chatbubbles-outline', iconOn: 'chatbubbles' },
  { name: 'map', label: 'nav.map', icon: 'map-outline', iconOn: 'map' },
  { name: 'feed', label: 'nav.feed', icon: 'newspaper-outline', iconOn: 'newspaper' },
];

export interface NavBarProps {
  mode: LayoutMode;
  state: { index: number; routes: { key: string; name: string }[] };
  navigate: (name: string) => void;
}

export function NavBar({ mode, state, navigate }: NavBarProps) {
  const colors = useColors();
  const { t } = useT();
  const current = state.routes[state.index]?.name;
  const insets = useSafeAreaInsets();
  if (mode === 'desktop') return <Sidebar current={current} navigate={navigate} />;
  return (
    <Row
      gap={0}
      style={{
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.surface,
        paddingBottom: insets.bottom,
      }}
    >
      {MENU.map((m) => {
        const on = current === m.name;
        return (
          <Pressable
            key={m.name}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => navigate(m.name)}
            style={{ flex: 1, alignItems: 'center', paddingVertical: space.sm, gap: 2 }}
          >
            <Icon name={on ? m.iconOn : m.icon} color={on ? colors.primary : colors.textMuted} />
            <Text variant="caption" color={on ? colors.primary : colors.textMuted}>
              {t(m.label)}
            </Text>
          </Pressable>
        );
      })}
    </Row>
  );
}

function Sidebar({ current, navigate }: { current?: string; navigate: (name: string) => void }) {
  const colors = useColors();
  const { t } = useT();
  const me = useMyProfile();
  const avatar = useStorageUrl(me?.photos[0]);
  const balance = useBalance();
  return (
    <View
      style={{
        width: layout.sidebarWidth,
        borderRightWidth: 1,
        borderRightColor: colors.border,
        backgroundColor: colors.surface,
        padding: space.lg,
        justifyContent: 'space-between',
      }}
    >
      <Stack gap={space.xs}>
        <Text variant="title" color={colors.primary} style={{ marginBottom: space.lg }}>
          meesae
        </Text>
        {MENU.map((m) => {
          const on = current === m.name;
          return (
            <Pressable
              key={m.name}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => navigate(m.name)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.md,
                padding: space.md,
                borderRadius: radius.md,
                backgroundColor: on ? colors.primarySoft : pressed ? colors.bgMuted : 'transparent',
              })}
            >
              <Icon name={on ? m.iconOn : m.icon} color={on ? colors.primary : colors.text} />
              <Text variant="label" color={on ? colors.onPrimarySoft : colors.text}>
                {t(m.label)}
              </Text>
            </Pressable>
          );
        })}
      </Stack>
      <Pressable onPress={() => router.push('/profile/me')} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Avatar uri={avatar} name={me?.nickname} />
        <Stack gap={0} style={{ flex: 1 }}>
          <Text variant="label" numberOfLines={1}>
            {me?.nickname ?? t('nav.myProfile')}
          </Text>
          <Text variant="caption" color={colors.point}>
            {t('common.points', { n: balance })}
          </Text>
        </Stack>
      </Pressable>
    </View>
  );
}
