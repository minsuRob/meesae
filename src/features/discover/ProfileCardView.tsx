/**
 * 추천 카드 (Airbnb 숙소 카드 꼴): 4:5 사진 + 아래 캡션. 사진 위 왼쪽에 인증 배지, 오른쪽에 하트.
 */

import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import type { ProfileCard } from '@shared/api';

import { useStorageUrl } from '@/firebase/storage';
import { regionName, useT } from '@/i18n';
import { Icon, Photo, Pill, Press, Row, Stack, Text } from '@/ui/primitives';
import { space, useColors } from '@/ui/theme';

import { likeUser, startConversation } from './actions';

/** 사진 위 하트. 안 누르면 반투명 검정 채움 + 흰 테두리, 누르면 Rausch */
export function HeartButton({ liked, onPress, label }: { liked: boolean; onPress: () => void; label: string }) {
  const colors = useColors();
  return (
    <Press
      onPress={onPress}
      disabled={liked}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: liked }}
      haptic="success"
      pressScale={0.9}
      hitSlop={8}
      style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
    >
      <View style={{ position: 'absolute' }}>
        <Icon name="heart" size={26} color={liked ? colors.primary : 'rgba(0,0,0,0.5)'} />
      </View>
      {!liked ? <Icon name="heart-outline" size={26} color={colors.scrimText} /> : null}
    </Press>
  );
}

export function ProfileCardView({
  p,
  onLiked,
  onOpen,
}: {
  p: ProfileCard;
  onLiked?: (uid: string) => void;
  /** 없으면 프로필 화면으로 이동 (데스크톱 분할 화면에서는 오른쪽 패널에 연다) */
  onOpen?: (uid: string) => void;
}) {
  const colors = useColors();
  const { t, locale } = useT();
  const photo = useStorageUrl(p.photos[0]);
  const region = regionName(p.regionLabels, p.regionLabel, locale);
  const [liking, setLiking] = useState(false);
  const verified = p.badges.includes('phone');
  const open = () => (onOpen ? onOpen(p.uid) : router.push({ pathname: '/profile/[uid]', params: { uid: p.uid } }));

  return (
    <Stack gap={space.sm}>
      <View>
        <Press onPress={open} haptic={false} pressScale={0.99} accessibilityRole="button" accessibilityLabel={p.nickname}>
          <View>
            <Photo source={photo ? { uri: photo } : undefined} />
            {verified ? (
              <View style={{ position: 'absolute', top: space.md, left: space.md }}>
                <Pill label={t('discover.verified')} tone="onPhoto" icon="checkmark-circle" />
              </View>
            ) : null}
          </View>
        </Press>
        <View style={{ position: 'absolute', top: space.sm, right: space.sm }}>
          <HeartButton
            liked={p.likedByMe}
            label={p.likedByMe ? t('discover.liked') : t('discover.like')}
            onPress={async () => {
              if (liking) return;
              setLiking(true);
              const res = await likeUser(p.uid);
              setLiking(false);
              if (res) onLiked?.(p.uid);
            }}
          />
        </View>
      </View>
      <Press onPress={open} haptic={false} pressScale={1}>
        <Stack gap={space.xxs}>
          <Row gap={space.xs}>
            <Text variant="subtitle" numberOfLines={1} style={{ flexShrink: 1 }}>
              {p.nickname}
            </Text>
            <Text variant="bodySm" tone="muted">
              {p.age}
            </Text>
          </Row>
          <Text variant="bodySm" tone="muted" numberOfLines={1}>
            {[region, p.job].filter(Boolean).join(' · ') || t(`distance.${p.distance}`)}
          </Text>
          <Text variant="bodySm" tone="muted" numberOfLines={1}>
            {[p.mbti, t(`distance.${p.distance}`)].filter(Boolean).join(' · ')}
          </Text>
        </Stack>
      </Press>
      <Press onPress={() => startConversation(p.uid)} haptic="tap" pressScale={1} accessibilityRole="button" style={{ alignSelf: 'flex-start' }}>
        <Text variant="label" style={{ textDecorationLine: 'underline', fontWeight: '600', color: colors.text }}>
          {t('discover.chatLong')}
        </Text>
      </Press>
    </Stack>
  );
}
