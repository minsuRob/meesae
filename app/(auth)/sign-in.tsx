import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { toApiError } from '@/firebase/api';
import { DEV_LOGIN_ENABLED, devSignIn } from '@/firebase/auth/dev-login';
import { isAppleSignInAvailable, signInWithApple, signInWithGoogle } from '@/firebase/auth/social';
import { LanguageSegmented } from '@/features/settings/Preferences';
import { useT } from '@/i18n';
import { useSession } from '@/store/session';
import { Button, Card, ErrorText, Icon, Input, Screen, Stack, Text } from '@/ui/primitives';
import { space, useColors } from '@/ui/theme';

export default function SignIn() {
  const colors = useColors();
  const { t } = useT();
  const status = useSession((s) => s.status);
  const claims = useSession((s) => s.claims);
  const [apple, setApple] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devName, setDevName] = useState('alice');

  useEffect(() => {
    isAppleSignInAvailable().then(setApple).catch(() => setApple(false));
  }, []);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (e) {
      // 사용자가 창을 닫은 경우는 오류로 보지 않는다
      const raw = e instanceof Error ? `${(e as { code?: string }).code ?? ''} ${e.message}` : String(e);
      if (!/cancel|popup-closed|ERR_REQUEST_CANCELED/i.test(raw)) setError(toApiError(e).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen narrow edges={['top', 'bottom']}>
      <View style={{ alignItems: 'flex-end' }}>
        <View style={{ minWidth: 160 }}>
          <LanguageSegmented />
        </View>
      </View>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Stack gap={space.xxl}>
          <Stack gap={space.sm}>
            <Text variant="display" color={colors.primary} style={{ fontSize: 40, lineHeight: 48, fontWeight: '800', letterSpacing: -1.2 }}>
              meesae
            </Text>
            <Text variant="heading" tone="body" style={{ fontWeight: '400' }}>
              {t('auth.tagline')}
            </Text>
          </Stack>

          {status === 'signedIn' && claims.banned ? <ErrorText>{t('auth.banned')}</ErrorText> : null}

          <Stack gap={space.md}>
            <Button
              title={t('auth.google')}
              kind="secondary"
              icon={<Icon name="logo-google" size="md" />}
              loading={busy === 'google'}
              onPress={() => run('google', signInWithGoogle)}
            />
            {apple ? (
              <Button
                title={t('auth.apple')}
                kind="secondary"
                icon={<Icon name="logo-apple" size="md" />}
                loading={busy === 'apple'}
                onPress={() => run('apple', signInWithApple)}
              />
            ) : null}
            {Platform.OS === 'android' ? (
              <Text variant="caption" center>
                {t('auth.appleIosOnly')}
              </Text>
            ) : null}
          </Stack>

          {DEV_LOGIN_ENABLED ? (
            <Card style={{ backgroundColor: colors.bgMuted, borderColor: colors.hairline }}>
              <Stack gap={space.md}>
                <Text variant="label" tone="muted">
                  {t('auth.devTitle')}
                </Text>
                <Input value={devName} onChangeText={setDevName} autoCapitalize="none" placeholder={t('auth.devPlaceholder')} />
                <Button
                  title={t('auth.devSignInAs', { name: devName || 'tester' })}
                  small
                  loading={busy === 'dev'}
                  onPress={() => run('dev', () => devSignIn(devName))}
                />
              </Stack>
            </Card>
          ) : null}

          <ErrorText>{error}</ErrorText>
        </Stack>
      </View>
      <Text variant="caption" tone="faint" center>
        {t('auth.terms')}
      </Text>
    </Screen>
  );
}
