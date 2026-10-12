/**
 * 메인 탭 상단 바: 제목(또는 워드마크) + 포인트 알약 + 아바타(인증 배지). 포인트를 누르면 포인트 허브로 간다.
 * 아래 줄(탭 등)은 children 으로.
 */

import { router } from 'expo-router';
import type { ReactNode } from 'react';

import { useStorageUrl } from '@/firebase/storage';
import { useT } from '@/i18n';
import { useClaims } from '@/store/session';
import { useBalance } from '@/store/wallet';
import { useLayoutMode } from '@/ui/layout/useLayoutMode';
import { Avatar, HeaderBar, Pill, Press } from '@/ui/primitives';

import { useMyProfile } from './useMyProfile';

export function MainHeader({ title, wordmark, right, children }: { title?: string; wordmark?: boolean; right?: ReactNode; children?: ReactNode }) {
  const { t } = useT();
  const me = useMyProfile();
  const avatar = useStorageUrl(me?.photos[0]);
  const balance = useBalance();
  const claims = useClaims();
  const mode = useLayoutMode();

  return (
    <HeaderBar
      title={title}
      wordmark={wordmark}
      hairline={!children}
      right={
        <>
          {right}
          <Press
            onPress={() => router.push({ pathname: '/feed', params: { tab: 'points' } })}
            accessibilityRole="button"
            accessibilityLabel={t('header.pointsA11y', { n: balance })}
            haptic={false}
          >
            <Pill label={t('common.points', { n: balance })} tone="outline" icon="diamond-outline" />
          </Press>
          {mode === 'mobile' ? (
            <Press onPress={() => router.push('/profile/me')} accessibilityRole="button" accessibilityLabel={t('nav.myProfile')} haptic={false}>
              <Avatar uri={avatar} name={me?.nickname} size="sm" verified={claims.phoneVerified} />
            </Press>
          ) : null}
        </>
      }
    >
      {children}
    </HeaderBar>
  );
}
