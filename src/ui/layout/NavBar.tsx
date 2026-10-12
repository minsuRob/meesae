/**
 * 메인 내비게이션. desktop = 왼쪽 사이드바(메뉴 3개 + 아래 프로필), mobile = 하단 탭.
 * expo-router Tabs 의 tabBar 로 끼운다. 대화 탭에는 안 읽은 메시지 수가 붙는다.
 */

import { router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUnreadCount } from '@/features/chat/ConversationList';
import { useMyProfile } from '@/features/profile/useMyProfile';
import { useStorageUrl } from '@/firebase/storage';
import { useT, type MessageKey } from '@/i18n';
import { useClaims } from '@/store/session';
import { useBalance } from '@/store/wallet';

import { Avatar, Icon, Pill, Press, Row, Stack, Text, type IconName } from '../primitives';
import { control, layout, radius, space, useColors } from '../theme';
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

function UnreadBadge({ n }: { n: number }) {
  const colors = useColors();
  const { t } = useT();
  if (n <= 0) return null;
  return (
    <View
      accessibilityLabel={t('nav.unreadA11y', { n })}
      style={{
        position: 'absolute',
        top: -space.xs,
        right: -space.sm,
        minWidth: 18,
        height: 18,
        paddingHorizontal: space.xs + 1,
        borderRadius: radius.pill,
        backgroundColor: colors.primary,
        borderWidth: 2,
        borderColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant="badge" color={colors.onPrimary} style={{ fontSize: 10, lineHeight: 12 }}>
        {n > 99 ? '99+' : n}
      </Text>
    </View>
  );
}

export function NavBar({ mode, state, navigate }: NavBarProps) {
  const colors = useColors();
  const { t } = useT();
  const unread = useUnreadCount();
  const current = state.routes[state.index]?.name;
  const insets = useSafeAreaInsets();
  if (mode === 'desktop') return <Sidebar current={current} navigate={navigate} unread={unread} />;
  return (
    <Row
      gap={0}
      style={{
        borderTopWidth: 1,
        borderTopColor: colors.hairline,
        backgroundColor: colors.surface,
        paddingBottom: insets.bottom,
        height: control.tabBar + insets.bottom,
      }}
    >
      {MENU.map((m) => {
        const on = current === m.name;
        return (
          <Press
            key={m.name}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t(m.label)}
            onPress={() => navigate(m.name)}
            haptic="select"
            pressScale={0.96}
            containerStyle={{ flex: 1 }}
            style={{ alignItems: 'center', justifyContent: 'center', height: control.tabBar, gap: space.xxs }}
          >
            <View>
              <Icon name={on ? m.iconOn : m.icon} size="lg" color={on ? colors.primary : colors.textMuted} />
              {m.name === 'chat' ? <UnreadBadge n={unread} /> : null}
            </View>
            <Text variant="badge" color={on ? colors.primary : colors.textMuted} style={{ fontSize: 10, fontWeight: on ? '600' : '500' }}>
              {t(m.label)}
            </Text>
          </Press>
        );
      })}
    </Row>
  );
}

function Sidebar({ current, navigate, unread }: { current?: string; navigate: (name: string) => void; unread: number }) {
  const colors = useColors();
  const { t } = useT();
  const me = useMyProfile();
  const claims = useClaims();
  const avatar = useStorageUrl(me?.photos[0]);
  const balance = useBalance();
  return (
    <View
      style={{
        width: layout.sidebarWidth,
        borderRightWidth: 1,
        borderRightColor: colors.hairline,
        backgroundColor: colors.surface,
        padding: space.lg,
        justifyContent: 'space-between',
      }}
    >
      <Stack gap={space.xs}>
        <Text variant="title" color={colors.primary} style={{ fontWeight: '800', letterSpacing: -0.8, marginBottom: space.lg, paddingHorizontal: space.md }}>
          meesae
        </Text>
        {MENU.map((m) => {
          const on = current === m.name;
          return (
            <Press
              key={m.name}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => navigate(m.name)}
              haptic={false}
              pressScale={0.99}
              style={(pressed) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.md,
                paddingVertical: space.md,
                paddingHorizontal: space.md,
                borderRadius: radius.sm,
                backgroundColor: on || pressed ? colors.bgMuted : 'transparent',
              })}
            >
              <Icon name={on ? m.iconOn : m.icon} size="lg" color={colors.text} />
              <Text variant="subtitle" style={{ flex: 1, fontWeight: on ? '600' : '500' }}>
                {t(m.label)}
              </Text>
              {m.name === 'chat' && unread > 0 ? <Pill label={unread > 99 ? '99+' : String(unread)} tone="primary" /> : null}
            </Press>
          );
        })}
      </Stack>
      <Press onPress={() => router.push('/profile/me')} haptic={false} pressScale={0.99} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm }}>
        <Avatar uri={avatar} name={me?.nickname} verified={claims.phoneVerified} />
        <Stack gap={0} style={{ flex: 1 }}>
          <Text variant="label" numberOfLines={1} style={{ fontWeight: '600' }}>
            {me?.nickname ?? t('nav.myProfile')}
          </Text>
          <Text variant="caption">{t('common.points', { n: balance })}</Text>
        </Stack>
      </Press>
    </View>
  );
}
