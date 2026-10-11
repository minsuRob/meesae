import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { toApiError } from '@/firebase/api';
import { DEV_LOGIN_ENABLED, devSignIn } from '@/firebase/auth/dev-login';
import { isAppleSignInAvailable, signInWithApple, signInWithGoogle } from '@/firebase/auth/social';
import { LanguagePicker } from '@/features/settings/Preferences';
import { useT } from '@/i18n';
import { useSession } from '@/store/session';
import { Button, Card, Divider, ErrorText, Input, Screen, Stack, Text } from '@/ui/primitives';
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
    <Screen narrow style={{ justifyContent: 'center' }}>
      <Stack gap={space.xl}>
        <View style={{ alignSelf: 'flex-end', width: 200 }}>
          <LanguagePicker withSystem={false} />
        </View>
        <Stack gap={space.sm}>
          <Text variant="title" color={colors.primary}>
            meesae
          </Text>
          <Text variant="caption">{t('auth.tagline')}</Text>
        </Stack>

        {status === 'signedIn' && claims.banned ? <ErrorText>{t('auth.banned')}</ErrorText> : null}

        <Stack gap={space.md}>
          <Button title={t('auth.google')} kind="secondary" loading={busy === 'google'} onPress={() => run('google', signInWithGoogle)} />
          {apple ? (
            <Button title={t('auth.apple')} kind="secondary" loading={busy === 'apple'} onPress={() => run('apple', signInWithApple)} />
          ) : null}
          {Platform.OS === 'android' ? <Text variant="caption">{t('auth.appleIosOnly')}</Text> : null}
        </Stack>

        {DEV_LOGIN_ENABLED ? (
          <Card style={{ backgroundColor: colors.bgMuted }}>
            <Stack gap={space.md}>
              <Text variant="label">{t('auth.devTitle')}</Text>
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

        <Divider />
        <ErrorText>{error}</ErrorText>
        <Text variant="caption" center>
          {t('auth.terms')}
        </Text>
      </Stack>
    </Screen>
  );
}
