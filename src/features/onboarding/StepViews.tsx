/**
 * 온보딩 단계 화면들. 각 컴포넌트는 draft 를 읽고 update 로만 바꾼다.
 * 순서·검증 필드는 steps.ts 가, 문구는 번역 카탈로그가 정한다.
 */

import { getLocales } from 'expo-localization';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { COUNTRIES, countryFromLocale } from '@shared/countries';
import {
  DRINKING,
  GENDERS,
  MBTIS,
  SMOKING,
  type FieldErrors,
  type OnboardingDraft,
} from '@shared/onboarding-schema';
import { LIMITS, type Issue } from '@shared/validators';

import { toApiError } from '@/firebase/api';
import { pickImage, uploadImage, useStorageUrl } from '@/firebase/storage';
import { countryName, issueMessage, regionName, useT } from '@/i18n';
import { useUid } from '@/store/session';
import { Button, Chip, ErrorText, Input, Photo, Row, Stack, Text } from '@/ui/primitives';
import { radius, space, useColors } from '@/ui/theme';

import { verifyLocation } from '../location/current';
import { useDraft } from './draft';

export interface StepProps {
  draft: OnboardingDraft;
  update: (patch: Partial<OnboardingDraft>) => void;
  errors: FieldErrors;
}

/** 검증 이슈 → 지금 언어 문구 */
function useIssue() {
  const { locale } = useT();
  return (issue: Issue | undefined) => (issue ? issueMessage(issue, locale) : null);
}

/** 19950412 → 1995-04-12 */
function formatBirth(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
}

export function BasicStep({ draft, update, errors }: StepProps) {
  const { t } = useT();
  const msg = useIssue();
  return (
    <Stack gap={space.lg}>
      <Input
        label={t('fields.nickname')}
        value={draft.nickname ?? ''}
        onChangeText={(nickname) => update({ nickname })}
        maxLength={LIMITS.NICKNAME_MAX}
        autoCapitalize="none"
        placeholder={t('onboarding.nicknamePlaceholder', { min: LIMITS.NICKNAME_MIN, max: LIMITS.NICKNAME_MAX })}
        error={msg(errors.nickname)}
      />
      <Input
        label={t('fields.birthDate')}
        value={draft.birthDate ?? ''}
        onChangeText={(v) => update({ birthDate: formatBirth(v) })}
        keyboardType="number-pad"
        placeholder={t('onboarding.birthPlaceholder')}
        error={msg(errors.birthDate)}
        hint={t('onboarding.birthHint')}
      />
      <Stack gap={space.sm}>
        <Text variant="label">{t('fields.gender')}</Text>
        <Row>
          {GENDERS.map((g) => (
            <Chip key={g} label={t(`options.gender.${g}`)} selected={draft.gender === g} onPress={() => update({ gender: g })} />
          ))}
        </Row>
        <ErrorText>{msg(errors.gender)}</ErrorText>
      </Stack>
    </Stack>
  );
}

function PhotoTile({ path, onRemove }: { path: string; onRemove: () => void }) {
  const colors = useColors();
  const { t } = useT();
  const url = useStorageUrl(path);
  return (
    <Pressable onPress={onRemove} style={{ width: '31%' }} accessibilityLabel={t('onboarding.removePhoto')}>
      <Photo source={url ? { uri: url } : undefined} />
      <View
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          backgroundColor: colors.overlay,
          borderRadius: radius.pill,
          paddingHorizontal: 8,
        }}
      >
        <Text color={colors.textInverse}>×</Text>
      </View>
    </Pressable>
  );
}

export function PhotosStep({ draft, update, errors }: StepProps) {
  const { t } = useT();
  const msg = useIssue();
  const uid = useUid();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photos = draft.photos ?? [];

  async function add() {
    if (!uid) return;
    setError(null);
    try {
      const asset = await pickImage();
      if (!asset) return;
      setBusy(true);
      const path = await uploadImage(asset.uri, `users/${uid}/profile`);
      update({ photos: [...(useDraft.getState().draft.photos ?? []), path] });
    } catch (e) {
      setError(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack gap={space.lg}>
      <Text variant="caption">{t('onboarding.photosHint', { max: LIMITS.PROFILE_PHOTOS_MAX })}</Text>
      <Row style={{ flexWrap: 'wrap' }} gap={space.sm}>
        {photos.map((p) => (
          <PhotoTile key={p} path={p} onRemove={() => update({ photos: photos.filter((x) => x !== p) })} />
        ))}
      </Row>
      {photos.length < LIMITS.PROFILE_PHOTOS_MAX ? (
        <Button title={t('onboarding.addPhoto')} kind="secondary" onPress={add} loading={busy} />
      ) : null}
      <ErrorText>{error ?? msg(errors.photos)}</ErrorText>
    </Stack>
  );
}

export function MbtiStep({ draft, update }: StepProps) {
  return (
    <Row style={{ flexWrap: 'wrap' }}>
      {MBTIS.map((m) => (
        <Chip key={m} label={m} selected={draft.mbti === m} onPress={() => update({ mbti: draft.mbti === m ? null : m })} />
      ))}
    </Row>
  );
}

export function DrinkingStep({ draft, update }: StepProps) {
  const { t } = useT();
  return (
    <Row style={{ flexWrap: 'wrap' }}>
      {DRINKING.map((d) => (
        <Chip key={d} label={t(`options.drinking.${d}`)} selected={draft.drinking === d} onPress={() => update({ drinking: d })} />
      ))}
    </Row>
  );
}

export function SmokingStep({ draft, update }: StepProps) {
  const { t } = useT();
  return (
    <Row style={{ flexWrap: 'wrap' }}>
      {SMOKING.map((d) => (
        <Chip key={d} label={t(`options.smoking.${d}`)} selected={draft.smoking === d} onPress={() => update({ smoking: d })} />
      ))}
    </Row>
  );
}

export function JobStep({ draft, update, errors }: StepProps) {
  const { t } = useT();
  const msg = useIssue();
  return (
    <Input
      label={t('fields.job')}
      value={draft.job ?? ''}
      onChangeText={(job) => update({ job })}
      maxLength={LIMITS.JOB_MAX}
      placeholder={t('onboarding.jobPlaceholder')}
      error={msg(errors.job)}
    />
  );
}

export function SchoolStep({ draft, update, errors }: StepProps) {
  const { t } = useT();
  const msg = useIssue();
  return (
    <Input
      label={t('fields.school')}
      value={draft.school ?? ''}
      onChangeText={(school) => update({ school })}
      maxLength={LIMITS.SCHOOL_MAX}
      placeholder={t('onboarding.schoolPlaceholder')}
      error={msg(errors.school)}
    />
  );
}

/** 위치 권한 → updateLocation. 정확한 좌표는 서버 비공개 문서에만 저장된다. */
export function LocationStep() {
  const colors = useColors();
  const { t, locale } = useT();
  const region = useDraft((s) => s.region);
  const setRegion = useDraft((s) => s.setRegion);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      const res = await verifyLocation();
      setRegion({ label: res.regionLabel, labels: res.regionLabels });
      setMessage(res.rewarded > 0 ? t('onboarding.locationDoneReward', { n: res.rewarded }) : t('onboarding.locationDone'));
    } catch (e) {
      setError(`${toApiError(e).message}\n${t('onboarding.locationSkippable')}`);
    } finally {
      setBusy(false);
    }
  }

  const label = region ? regionName(region.labels, region.label, locale) : null;
  return (
    <Stack gap={space.lg}>
      <Text variant="caption">{t('onboarding.locationHint')}</Text>
      {label ? <Text variant="heading">📍 {label}</Text> : null}
      <Button title={label ? t('onboarding.locationVerifyAgain') : t('onboarding.locationVerify')} onPress={verify} loading={busy} />
      {message ? <Text color={colors.success}>{message}</Text> : null}
      <ErrorText>{error}</ErrorText>
    </Stack>
  );
}

export function CountryStep({ draft, update, errors }: StepProps) {
  const { t } = useT();
  const msg = useIssue();
  useEffect(() => {
    if (!draft.countryCode) update({ countryCode: countryFromLocale(getLocales()[0]?.regionCode) });
  }, [draft.countryCode, update]);
  return (
    <Stack gap={space.md}>
      <Text variant="caption">{t('onboarding.countryHint')}</Text>
      <Row style={{ flexWrap: 'wrap' }}>
        {COUNTRIES.map((c) => (
          <Chip
            key={c.code}
            label={`${c.flag} ${countryName(c.code, t)}`}
            selected={draft.countryCode === c.code}
            onPress={() => update({ countryCode: c.code })}
          />
        ))}
      </Row>
      <ErrorText>{msg(errors.countryCode)}</ErrorText>
    </Stack>
  );
}
