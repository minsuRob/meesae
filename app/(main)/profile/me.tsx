/**
 * 내 프로필 보기·수정. 수정은 updateProfile 로만 (공개 문서는 서버만 쓴다).
 */

import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
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
import { KeyboardScrollView } from '@/ui/keyboard';
import { notify } from '@/ui/notify';
import { Button, Chip, HeaderBar, IconButton, Input, Loading, PhotoTile, Pill, Row, Stack, Text, toast } from '@/ui/primitives';
import { layout, space, useColors } from '@/ui/theme';

function Thumb({ path, onRemove }: { path: string; onRemove?: () => void }) {
  const { t } = useT();
  const url = useStorageUrl(path);
  return <PhotoTile uri={url} onRemove={onRemove} removeLabel={t('onboarding.removePhoto')} aspect={layout.photoAspect} />;
}

export default function MeScreen() {
  const uid = useUid();
  const me = useMyProfile();
  if (!me || !uid) return <Loading />;
  // 폼은 처음 받은 프로필로 한 번 초기화한다 (저장 후 실시간 갱신이 입력 중인 값을 덮지 않게)
  return <MeForm key={me.uid} me={me} uid={uid} />;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Stack gap={space.sm}>
      <Text variant="subtitle">{title}</Text>
      {children}
    </Stack>
  );
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
      toast(t('common.saved'));
    } catch (e) {
      notify(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <HeaderBar
        title={t('me.title')}
        center
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/chat'))}
        backLabel={t('common.back')}
        right={<IconButton name="settings-outline" label={t('me.settings')} variant="ghost" onPress={() => router.push('/profile/settings')} />}
      />
      <KeyboardScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.lg, gap: space.xl, maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' }}
      >
        <Stack gap={space.sm}>
          <Row gap={space.sm} style={{ alignItems: 'baseline' }}>
            <Text variant="display">{me.nickname}</Text>
            <Text variant="heading" tone="muted">
              {me.age}
            </Text>
          </Row>
          <Row gap={space.xs} style={{ flexWrap: 'wrap' }}>
            {claims.phoneVerified ? <Pill label={t('me.phoneBadge')} tone="success" icon="checkmark-circle" /> : null}
            {region ? <Pill label={region} tone="outline" icon="location-outline" /> : null}
          </Row>
          {!claims.phoneVerified ? (
            <Button title={t('me.verifyCta')} kind="secondary" small onPress={() => router.push('/profile/phone-verify')} style={{ alignSelf: 'flex-start' }} />
          ) : null}
        </Stack>

        <Section title={t('me.photosHint')}>
          <Row style={{ flexWrap: 'wrap' }} gap={space.sm}>
            {photos.map((p) => (
              <Thumb key={p} path={p} onRemove={photos.length > 1 ? () => setPhotos(photos.filter((x) => x !== p)) : undefined} />
            ))}
          </Row>
          {photos.length < LIMITS.PROFILE_PHOTOS_MAX ? (
            <Button title={t('me.addPhoto')} kind="secondary" small onPress={addPhoto} loading={busy} style={{ alignSelf: 'flex-start' }} />
          ) : null}
        </Section>

        <Input label={t('fields.nickname')} value={nickname} onChangeText={setNickname} maxLength={LIMITS.NICKNAME_MAX} />
        <Input label={t('fields.job')} value={job} onChangeText={setJob} maxLength={LIMITS.JOB_MAX} />
        <Input label={t('fields.school')} value={school} onChangeText={setSchool} maxLength={LIMITS.SCHOOL_MAX} />

        <Section title={t('fields.mbti')}>
          <Row style={{ flexWrap: 'wrap' }}>
            {MBTIS.map((m) => (
              <Chip key={m} label={m} small selected={mbti === m} onPress={() => setMbti(mbti === m ? null : m)} />
            ))}
          </Row>
        </Section>
        <Section title={t('fields.drinking')}>
          <Row style={{ flexWrap: 'wrap' }}>
            {DRINKING.map((d) => (
              <Chip key={d} label={t(`options.drinking.${d}`)} selected={drinking === d} onPress={() => setDrinking(d)} />
            ))}
          </Row>
        </Section>
        <Section title={t('fields.smoking')}>
          <Row style={{ flexWrap: 'wrap' }}>
            {SMOKING.map((d) => (
              <Chip key={d} label={t(`options.smoking.${d}`)} selected={smoking === d} onPress={() => setSmoking(d)} />
            ))}
          </Row>
        </Section>
        <View style={{ height: space.xl }} />
      </KeyboardScrollView>
      <View style={{ borderTopWidth: 1, borderTopColor: colors.hairline, backgroundColor: colors.surface, padding: space.lg }}>
        <View style={{ maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' }}>
          <Button title={t('common.save')} onPress={save} loading={busy} />
        </View>
      </View>
    </SafeAreaView>
  );
}
