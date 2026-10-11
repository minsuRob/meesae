/**
 * 다른 사람의 프로필. 거리 버킷·좋아요 여부가 필요해서 Functions(getProfile)로 읽는다.
 */

import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';

import { REPORT_REASONS, type ProfileCard, type ReportReason } from '@shared/api';

import { call, toApiError } from '@/firebase/api';
import { useAsync } from '@/firebase/hooks';
import { useStorageUrl } from '@/firebase/storage';
import { regionName, useT } from '@/i18n';
import { confirm, notify } from '@/ui/notify';
import { Badge, Button, Empty, Icon, Loading, Photo, Row, Sheet, Stack, Text } from '@/ui/primitives';
import { layout, space, useColors } from '@/ui/theme';

import { likeUser, startConversation } from '../discover/actions';

function PhotoItem({ path }: { path: string }) {
  const url = useStorageUrl(path);
  return <Photo source={url ? { uri: url } : undefined} />;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Text variant="caption">{label}</Text>
      <Text>{value}</Text>
    </Row>
  );
}

export function ProfileView({ uid }: { uid: string }) {
  const colors = useColors();
  const { t, locale } = useT();
  const res = useAsync(() => call('getProfile', { uid }), `profile:${uid}`);
  // 좋아요를 누른 뒤 화면에만 반영 (다시 읽지 않는다)
  const [likedNow, setLikedNow] = useState(false);
  const [report, setReport] = useState(false);

  if (res.error) return <Empty title={t('profile.unavailable')} body={toApiError(res.error).message} />;
  if (!res.data) return <Loading />;
  const p: ProfileCard = { ...res.data.profile, likedByMe: res.data.profile.likedByMe || likedNow };

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

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space.lg, gap: space.lg, maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' }}
    >
      <Stack gap={space.sm}>
        {p.photos.map((ph) => (
          <PhotoItem key={ph} path={ph} />
        ))}
      </Stack>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={space.sm}>
          <Text variant="title">{p.nickname}</Text>
          <Text variant="heading" color={colors.textMuted}>
            {p.age}
          </Text>
          {p.badges.includes('phone') ? <Icon name="checkmark-circle" color={colors.verified} /> : null}
        </Row>
        <Badge label={t(`distance.${p.distance}`)} color={colors.accent} />
      </Row>
      <Stack gap={space.sm}>
        <Field label={t('profile.region')} value={regionName(p.regionLabels, p.regionLabel, locale)} />
        <Field label={t('fields.gender')} value={t(`options.gender.${p.gender}`)} />
        <Field label={t('fields.mbti')} value={p.mbti} />
        <Field label={t('fields.drinking')} value={p.drinking ? t(`options.drinking.${p.drinking}`) : null} />
        <Field label={t('fields.smoking')} value={p.smoking ? t(`options.smoking.${p.smoking}`) : null} />
        <Field label={t('fields.job')} value={p.job} />
        <Field label={t('fields.school')} value={p.school} />
      </Stack>
      <Row gap={space.md}>
        <Button
          title={p.likedByMe ? t('discover.liked') : t('discover.like')}
          disabled={p.likedByMe}
          style={{ flex: 1 }}
          onPress={async () => {
            if (await likeUser(uid)) setLikedNow(true);
          }}
        />
        <Button title={t('discover.chatLong')} kind="secondary" style={{ flex: 1 }} onPress={() => startConversation(uid)} />
      </Row>
      <Row gap={space.md} style={{ justifyContent: 'center' }}>
        <Button title={t('common.report')} kind="ghost" small onPress={() => setReport(true)} />
        <Button title={t('common.block')} kind="ghost" small onPress={block} />
      </Row>

      <Sheet visible={report} onClose={() => setReport(false)} title={t('chat.reportTitle')}>
        <Stack gap={space.sm}>
          {REPORT_REASONS.map((r) => (
            <Button key={r} title={t(`reportReasons.${r}`)} kind="secondary" onPress={() => sendReport(r)} />
          ))}
        </Stack>
      </Sheet>
    </ScrollView>
  );
}
