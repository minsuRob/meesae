/**
 * 휴대폰 인증 (추가 권한). 웹은 reCAPTCHA, 네이티브는 RNFirebase 로 인증번호를 받고
 * JS SDK 로 계정에 번호를 연결한 뒤 서버가 phoneVerified 클레임을 붙인다.
 */

import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COUNTRIES, toE164 } from '@shared/countries';

import { toApiError } from '@/firebase/api';
import { RECAPTCHA_CONTAINER_ID, requestPhoneCode } from '@/firebase/auth/phone';
import { confirmPhoneCode } from '@/firebase/auth/phone-link';
import { USE_EMULATOR } from '@/firebase/config';
import { useMyProfile } from '@/features/profile/useMyProfile';
import { countryName, useT } from '@/i18n';
import { useClaims } from '@/store/session';
import { notify } from '@/ui/notify';
import { Button, Chip, ErrorText, Input, Row, Screen, Stack, Text } from '@/ui/primitives';
import { space, useColors } from '@/ui/theme';

export default function PhoneVerifyScreen() {
  const colors = useColors();
  const { t } = useT();
  const me = useMyProfile();
  const claims = useClaims();
  const [country, setCountry] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cc = country ?? me?.countryCode ?? 'KR';

  async function send() {
    setError(null);
    const e164 = toE164(phone, cc);
    if (!e164) {
      setError(t('errors.phoneInvalid'));
      return;
    }
    setBusy(true);
    try {
      setVerificationId(await requestPhoneCode(e164));
    } catch (e) {
      setError(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!verificationId) return;
    setBusy(true);
    setError(null);
    try {
      const r = await confirmPhoneCode(verificationId, code);
      notify(t('phone.success'), r.rewarded > 0 ? t('phone.successReward', { n: r.rewarded }) : undefined);
      router.back();
    } catch (e) {
      setError(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen scroll narrow edges={[]}>
        <Stack gap={space.lg}>
          <Button title={`← ${t('common.back')}`} kind="ghost" small style={{ alignSelf: 'flex-start' }} onPress={() => router.back()} />
          <Text variant="title">{t('phone.title')}</Text>
          {claims.phoneVerified ? (
            <Text color={colors.success}>{t('phone.done')}</Text>
          ) : (
            <>
              <Text variant="caption">{t('phone.intro')}</Text>
              <Row style={{ flexWrap: 'wrap' }}>
                {COUNTRIES.slice(0, 8).map((c) => (
                  <Chip key={c.code} label={`${c.flag} +${c.dial}`} selected={cc === c.code} onPress={() => setCountry(c.code)} />
                ))}
              </Row>
              <Input
                label={t('phone.number', { country: countryName(cc, t) })}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder={cc === 'KR' ? '010-1234-5678' : t('phone.placeholder')}
              />
              <Button
                title={verificationId ? t('phone.resend') : t('phone.send')}
                kind="secondary"
                onPress={send}
                loading={busy && !verificationId}
              />
              {verificationId ? (
                <>
                  <Input label={t('phone.code')} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
                  <Button title={t('phone.verify')} onPress={verify} loading={busy} disabled={code.length < 6} />
                </>
              ) : null}
              {USE_EMULATOR ? <Text variant="caption">{t('phone.emulatorHint')}</Text> : null}
              <ErrorText>{error}</ErrorText>
            </>
          )}
          <View nativeID={RECAPTCHA_CONTAINER_ID} />
        </Stack>
      </Screen>
    </SafeAreaView>
  );
}
