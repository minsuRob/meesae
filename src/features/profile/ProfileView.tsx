/**
 * 다른 사람의 프로필. 거리 버킷·좋아요 여부가 필요해서 Functions(getProfile)로 읽는다.
 * 위는 사진 페이저(스크림 위 이름·나이), 아래는 항목 묶음, 맨 아래 고정 액션 바.
 */

import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';

import { REPORT_REASONS, type ProfileCard, type ReportReason } from '@shared/api';
import { isOnline } from '@shared/presence';

import { call, toApiError } from '@/firebase/api';
import { useAsync } from '@/firebase/hooks';
import { useStorageUrl } from '@/firebase/storage';
import { regionName, useT } from '@/i18n';
import { confirm, notify } from '@/ui/notify';
import { Button, Empty, Icon, IconButton, ListGroup, ListRow, Loading, Photo, PhotoScrim, Pill, Row, Sheet, Stack, Text } from '@/ui/primitives';
import { layout, radius, space, useColors } from '@/ui/theme';
import { useNow } from '@/ui/useNow';

import { likeUser, startConversation } from '../discover/actions';

function PhotoPage({ path, width }: { path: string; width: number }) {
  const url = useStorageUrl(path);
  return (
    <View style={{ width }}>
      <Photo source={url ? { uri: url } : undefined} rounded={false} />
    </View>
  );
}

function Dots({ n, index }: { n: number; index: number }) {
  const colors = useColors();
  if (n < 2) return null;
  return (
    <Row gap={space.xs} style={{ justifyContent: 'center' }}>
      {Array.from({ length: n }, (_, i) => (
        <View
          key={i}
          style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.scrimText, opacity: i === index ? 1 : 0.5 }}
        />
      ))}
    </Row>
  );
}

export function ProfileView({ uid, onBack }: { uid: string; onBack?: () => void }) {
  const colors = useColors();
  const { t, locale } = useT();
  const res = useAsync(() => call('getProfile', { uid }), `profile:${uid}`);
  // 좋아요를 누른 뒤 화면에만 반영 (다시 읽지 않는다)
  const [likedNow, setLikedNow] = useState(false);
  const [report, setReport] = useState(false);
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const now = useNow(60_000);

  if (res.error) return <Empty icon="person-outline" title={t('profile.unavailable')} body={toApiError(res.error).message} />;
  if (!res.data) return <Loading />;
  const p: ProfileCard = { ...res.data.profile, likedByMe: res.data.profile.likedByMe || likedNow };
  const region = regionName(p.regionLabels, p.regionLabel, locale);

  async function block() {
    if (!(await confirm(t('chat.blockTitle'), t('chat.blockBody'), t('common.block')))) return;
    try {
      await call('blockUser', { targetUid: uid });
      notify(t('profile.blocked'));
      if (router.canGoBack()) router.back();
    } catch (e) {
      notify(toApiError(e).message);
    }
  }

  async function sendReport(reason: ReportReason) {
    setReport(false);
    try {
      await call('reportUser', { targetUid: uid, reason, refPath: `users_public/${uid}` });
      notify(t('chat.reportDone'), t('chat.reportDoneBody'));
    } catch (e) {
      notify(toApiError(e).message);
    }
  }

  const fields: [string, string | null | undefined][] = [
    [t('profile.region'), region],
    [t('fields.gender'), t(`options.gender.${p.gender}`)],
    [t('fields.mbti'), p.mbti],
    [t('fields.drinking'), p.drinking ? t(`options.drinking.${p.drinking}`) : null],
    [t('fields.smoking'), p.smoking ? t(`options.smoking.${p.smoking}`) : null],
    [t('fields.job'), p.job],
    [t('fields.school'), p.school],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center', paddingBottom: space.xxl }}>
        <View onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))} style={{ overflow: 'hidden', borderRadius: 0 }}>
          {width > 0 ? (
            <FlatList
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              data={p.photos}
              keyExtractor={(ph) => ph}
              renderItem={({ item }) => <PhotoPage path={item} width={width} />}
              onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
            />
          ) : (
            <View style={{ aspectRatio: layout.photoAspect }} />
          )}
          <PhotoScrim>
            <Stack gap={space.sm}>
              <Row gap={space.sm} style={{ alignItems: 'baseline' }}>
                <Text variant="display" color={colors.scrimText}>
                  {p.nickname}
                </Text>
                <Text variant="heading" color={colors.scrimText} style={{ opacity: 0.9 }}>
                  {p.age}
                </Text>
                {p.badges.includes('phone') ? <Icon name="checkmark-circle" size="md" color={colors.scrimText} /> : null}
              </Row>
              <Row gap={space.xs} style={{ flexWrap: 'wrap' }}>
                {isOnline(p.lastActiveAt, now) ? <Pill label={t('discover.online')} tone="online" /> : null}
                <Pill label={t(`distance.${p.distance}`)} tone="onPhoto" icon="location-outline" />
                {region ? <Pill label={region} tone="onPhoto" /> : null}
              </Row>
              <Dots n={p.photos.length} index={page} />
            </Stack>
          </PhotoScrim>
          {onBack ? (
            <View style={{ position: 'absolute', top: space.md, left: space.md }}>
              <IconButton name="chevron-back" label={t('common.back')} variant="onPhoto" onPress={onBack} />
            </View>
          ) : null}
        </View>

        <Stack gap={space.xl} style={{ padding: space.lg }}>
          <ListGroup>
            {fields
              .filter(([, v]) => Boolean(v))
              .map(([label, value]) => (
                <ListRow key={label} title={label} value={value ?? ''} />
              ))}
          </ListGroup>
          <Row gap={space.lg} style={{ justifyContent: 'center' }}>
            <Button title={t('common.report')} kind="ghost" small onPress={() => setReport(true)} />
            <Button title={t('common.block')} kind="ghost" small onPress={block} />
          </Row>
        </Stack>
      </ScrollView>

      <View style={{ borderTopWidth: 1, borderTopColor: colors.hairline, backgroundColor: colors.surface, padding: space.lg }}>
        <Row gap={space.md} style={{ maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' }}>
          <Button
            title={p.likedByMe ? t('discover.liked') : t('discover.like')}
            disabled={p.likedByMe}
            icon={<Icon name={p.likedByMe ? 'heart' : 'heart-outline'} size="md" color={colors.onPrimary} />}
            style={{ flex: 1 }}
            onPress={async () => {
              if (await likeUser(uid)) setLikedNow(true);
            }}
          />
          <Button title={t('discover.chatLong')} kind="secondary" style={{ flex: 1 }} onPress={() => startConversation(uid)} />
        </Row>
      </View>

      <Sheet visible={report} onClose={() => setReport(false)} title={t('chat.reportTitle')} closeLabel={t('common.close')}>
        <ListGroup>
          {REPORT_REASONS.map((r) => (
            <ListRow key={r} title={t(`reportReasons.${r}`)} onPress={() => sendReport(r)} />
          ))}
        </ListGroup>
        <View style={{ height: radius.lg }} />
      </Sheet>
    </View>
  );
}
