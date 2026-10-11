import { router } from 'expo-router';
import { View } from 'react-native';

import type { ProfileCard } from '@shared/api';

import { useStorageUrl } from '@/firebase/storage';
import { regionName, useT } from '@/i18n';
import { Badge, Button, Card, Icon, Photo, Row, Stack, Text } from '@/ui/primitives';
import { space, useColors } from '@/ui/theme';

import { likeUser, startConversation } from './actions';

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
  return (
    <Card
      style={{ padding: 0, overflow: 'hidden' }}
      onPress={() => (onOpen ? onOpen(p.uid) : router.push({ pathname: '/profile/[uid]', params: { uid: p.uid } }))}
    >
      <Photo source={photo ? { uri: photo } : undefined} rounded={false} aspect={4 / 5} />
      <Stack gap={space.sm} style={{ padding: space.md }}>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Row gap={space.xs}>
            <Text variant="heading">{p.nickname}</Text>
            <Text variant="body" color={colors.textMuted}>
              {p.age}
            </Text>
            {p.badges.includes('phone') ? <Icon name="checkmark-circle" size={16} color={colors.verified} /> : null}
          </Row>
          <Badge label={t(`distance.${p.distance}`)} color={colors.accent} />
        </Row>
        <Text variant="caption" numberOfLines={1}>
          {[region, p.job, p.mbti].filter(Boolean).join(' · ') || ' '}
        </Text>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button
            title={p.likedByMe ? t('discover.liked') : t('discover.like')}
            small
            kind={p.likedByMe ? 'secondary' : 'primary'}
            disabled={p.likedByMe}
            style={{ flex: 1 }}
            onPress={async () => {
              const res = await likeUser(p.uid);
              if (res) onLiked?.(p.uid);
            }}
          />
          <Button title={t('discover.chat')} small kind="secondary" style={{ flex: 1 }} onPress={() => startConversation(p.uid)} />
        </View>
      </Stack>
    </Card>
  );
}
