/**
 * 내 프로필 보기·수정. 수정은 updateProfile 로만 (공개 문서는 서버만 쓴다).
 */

import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { UserPublic } from '@shared/models';
import {
  DRINKING,
  MBTIS,
  SMOKING,
  type Drinking,
  type Mbti,
  type Smoking,
} from '@shared/onboarding-schema';
import { LIMITS } from '@shared/validators';

import { call, toApiError } from '@/firebase/api';
import { pickImage, uploadImage, useStorageUrl } from '@/firebase/storage';
import { useMyProfile } from '@/features/profile/useMyProfile';
import { regionName, useT } from '@/i18n';
import { useClaims, useUid } from '@/store/session';
import { notify } from '@/ui/notify';
import { Badge, Button, Chip, Input, Loading, Photo, Row, Screen, Stack, Text } from '@/ui/primitives';
import { space, useColors } from '@/ui/theme';

function Thumb({ path, onRemove }: { path: string; onRemove: () => void }) {
  const { t } = useT();
  const url = useStorageUrl(path);
  return (
    <Pressable onPress={onRemove} style={{ width: '31%' }} accessibilityLabel={t('onboarding.removePhoto')}>
      <Photo source={url ? { uri: url } : undefined} />
    </Pressable>
  );
}

export default function MeScreen() {
  const uid = useUid();
  const me = useMyProfile();
  if (!me || !uid) return <Loading />;
  // 폼은 처음 받은 프로필로 한 번 초기화한다 (저장 후 실시간 갱신이 입력 중인 값을 덮지 않게)
  return <MeForm key={me.uid} me={me} uid={uid} />;
}

function MeForm({ me, uid }: { me: UserPublic; uid: string }) {
  const { t, locale } = useT();
  const region = regionName(me.regionLabels, me.regionLabel, locale);
  const colors = useColors();
  const claims = useClaims();
  const [nickname, setNickname] = useState(me.nickname);
  const [job, setJob] = useState(me.job);
  const [school, setSchool] = useState(me.school);
  const [mbti, setMbti] = useState<Mbti | null>(me.mbti);
  const [drinking, setDrinking] = useState<Drinking | null>(me.drinking);
  const [smoking, setSmoking] = useState<Smoking | null>(me.smoking);
  const [photos, setPhotos] = useState<string[]>(me.photos);
  const [busy, setBusy] = useState(false);

  async function addPhoto() {
    try {
      const a = await pickImage();
      if (!a) return;
      setBusy(true);
      const path = await uploadImage(a.uri, `users/${uid}/profile`);
      setPhotos((xs) => [...xs, path]);
    } catch (e) {
      notify(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      await call('updateProfile', { nickname, job, school, mbti, drinking, smoking, photos });
      notify(t('common.saved'));
    } catch (e) {
      notify(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen scroll narrow edges={[]}>
        <Stack gap={space.lg}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Button title={`← ${t('common.back')}`} kind="ghost" small onPress={() => (router.canGoBack() ? router.back() : router.replace('/chat'))} />
            <Button title={t('me.settings')} kind="secondary" small onPress={() => router.push('/profile/settings')} />
          </Row>
          <Row gap={space.sm}>
            <Text variant="title">{me.nickname}</Text>
            <Text variant="heading" color={colors.textMuted}>
              {me.age}
            </Text>
            {claims.phoneVerified ? <Badge label={t('me.phoneBadge')} /> : null}
            {region ? <Badge label={`📍 ${region}`} color={colors.accent} /> : null}
          </Row>
          {!claims.phoneVerified ? (
            <Button title={t('me.verifyCta')} kind="secondary" onPress={() => router.push('/profile/phone-verify')} />
          ) : null}

          <Text variant="label">{t('me.photosHint')}</Text>
          <Row style={{ flexWrap: 'wrap' }} gap={space.sm}>
            {photos.map((p) => (
              <Thumb key={p} path={p} onRemove={() => photos.length > 1 && setPhotos(photos.filter((x) => x !== p))} />
            ))}
          </Row>
          {photos.length < LIMITS.PROFILE_PHOTOS_MAX ? <Button title={t('me.addPhoto')} kind="secondary" small onPress={addPhoto} /> : null}

          <Input label={t('fields.nickname')} value={nickname} onChangeText={setNickname} maxLength={LIMITS.NICKNAME_MAX} />
          <Input label={t('fields.job')} value={job} onChangeText={setJob} maxLength={LIMITS.JOB_MAX} />
          <Input label={t('fields.school')} value={school} onChangeText={setSchool} maxLength={LIMITS.SCHOOL_MAX} />
          <Text variant="label">MBTI</Text>
          <Row style={{ flexWrap: 'wrap' }}>
            {MBTIS.map((m) => (
              <Chip key={m} label={m} selected={mbti === m} onPress={() => setMbti(mbti === m ? null : m)} />
            ))}
          </Row>
          <Text variant="label">{t('fields.drinking')}</Text>
          <Row style={{ flexWrap: 'wrap' }}>
            {DRINKING.map((d) => (
              <Chip key={d} label={t(`options.drinking.${d}`)} selected={drinking === d} onPress={() => setDrinking(d)} />
            ))}
          </Row>
          <Text variant="label">{t('fields.smoking')}</Text>
          <Row style={{ flexWrap: 'wrap' }}>
            {SMOKING.map((d) => (
              <Chip key={d} label={t(`options.smoking.${d}`)} selected={smoking === d} onPress={() => setSmoking(d)} />
            ))}
          </Row>
          <Button title={t('common.save')} onPress={save} loading={busy} />
        </Stack>
      </Screen>
    </SafeAreaView>
  );
}
