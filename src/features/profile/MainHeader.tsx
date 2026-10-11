/**
 * 메인 화면 상단: 제목 + 포인트 잔액 + 아바타(인증 배지). 포인트를 누르면 포인트 허브로 간다.
 */

import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useStorageUrl } from '@/firebase/storage';
import { useT } from '@/i18n';
import { useClaims } from '@/store/session';
import { useBalance } from '@/store/wallet';
import { useLayoutMode } from '@/ui/layout/useLayoutMode';
import { Avatar, Icon, Row, Text } from '@/ui/primitives';
import { radius, space, useColors } from '@/ui/theme';

import { useMyProfile } from './useMyProfile';

export function MainHeader({ title, right }: { title: string; right?: ReactNode }) {
  const colors = useColors();
  const { t } = useT();
  const me = useMyProfile();
  const avatar = useStorageUrl(me?.photos[0]);
  const balance = useBalance();
  const claims = useClaims();
  const mode = useLayoutMode();

  return (
    <Row
      style={{
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
        justifyContent: 'space-between',
      }}
    >
      <Text variant="heading">{title}</Text>
      <Row gap={space.md}>
        {right}
        <Pressable
          onPress={() => router.push({ pathname: '/feed', params: { tab: 'points' } })}
          accessibilityLabel={t('header.pointsA11y', { n: balance })}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: space.md,
            paddingVertical: 6,
            borderRadius: radius.pill,
            backgroundColor: colors.pointSoft,
          }}
        >
          <Icon name="diamond" size={14} color={colors.point} />
          <Text variant="label" color={colors.pointText}>
            {t('common.points', { n: balance })}
          </Text>
        </Pressable>
        {mode === 'mobile' ? (
          <Pressable onPress={() => router.push('/profile/me')} accessibilityLabel={t('nav.myProfile')}>
            <Avatar uri={avatar} name={me?.nickname} size={34} />
            {claims.phoneVerified ? (
              <View style={{ position: 'absolute', right: -2, bottom: -2 }}>
                <Icon name="checkmark-circle" size={16} color={colors.verified} />
              </View>
            ) : null}
          </Pressable>
        ) : null}
      </Row>
    </Row>
  );
}
