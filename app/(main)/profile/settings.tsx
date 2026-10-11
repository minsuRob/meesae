import { router } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COUNTRIES } from '@shared/countries';

import { call, toApiError } from '@/firebase/api';
import { verifyLocation } from '@/features/location/current';
import { useMyProfile } from '@/features/profile/useMyProfile';
import { AppearancePicker, LanguagePicker } from '@/features/settings/Preferences';
import { countryName, regionName, useT } from '@/i18n';
import { useSession } from '@/store/session';
import { confirm, notify } from '@/ui/notify';
import { Button, Card, Chip, Divider, Row, Screen, Stack, Text } from '@/ui/primitives';
import { space, useColors } from '@/ui/theme';

export default function SettingsScreen() {
  const colors = useColors();
  const { t, locale } = useT();
  const me = useMyProfile();
  const signOut = useSession((s) => s.signOut);
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      notify(toApiError(e).message);
    } finally {
      setBusy(null);
    }
  }

  const setCountry = (code: string) =>
    run(`country:${code}`, async () => {
      await call('setCountry', { countryCode: code });
    });

  const deleteAccount = () =>
    run('delete', async () => {
      if (!(await confirm(t('settings.deleteTitle'), t('settings.deleteBody'), t('settings.deleteOk')))) return;
      if (!(await confirm(t('settings.deleteFinalTitle'), t('settings.deleteFinalBody'), t('settings.deleteFinalOk')))) return;
      await call('deleteAccount', { confirm: 'DELETE' });
      await signOut();
    });

  const myRegion = me ? regionName(me.regionLabels, me.regionLabel, locale) : null;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen scroll narrow edges={[]}>
        <Stack gap={space.lg}>
          <Button title={`← ${t('common.back')}`} kind="ghost" small style={{ alignSelf: 'flex-start' }} onPress={() => router.back()} />
          <Text variant="title">{t('settings.title')}</Text>

          <Card>
            <Stack gap={space.md}>
              <Text variant="label">{t('settings.language')}</Text>
              <LanguagePicker />
              <Divider />
              <Text variant="label">{t('settings.appearance')}</Text>
              <AppearancePicker />
            </Stack>
          </Card>

          <Card>
            <Stack gap={space.md}>
              <Text variant="label">{t('settings.country')}</Text>
              <Text variant="caption">{t('settings.countryHint')}</Text>
              <Row style={{ flexWrap: 'wrap' }}>
                {COUNTRIES.map((c) => (
                  <Chip
                    key={c.code}
                    label={`${c.flag} ${countryName(c.code, t)}`}
                    selected={me?.countryCode === c.code}
                    onPress={() => setCountry(c.code)}
                  />
                ))}
              </Row>
            </Stack>
          </Card>

          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <Stack gap={2} style={{ flex: 1 }}>
                <Text variant="label">{t('settings.region')}</Text>
                <Text variant="caption">{myRegion ?? t('settings.regionNone')}</Text>
              </Stack>
              <Button
                title={t('settings.reverify')}
                small
                kind="secondary"
                loading={busy === 'loc'}
                onPress={() =>
                  run('loc', async () => {
                    const r = await verifyLocation();
                    notify(
                      `📍 ${regionName(r.regionLabels, r.regionLabel, locale)}`,
                      r.rewarded ? t('map.rewarded', { n: r.rewarded }) : undefined,
                    );
                  })
                }
              />
            </Row>
          </Card>

          <Divider />
          <Button title={t('settings.signOut')} kind="secondary" onPress={() => run('signout', signOut)} />
          <Button title={t('settings.deleteAccount')} kind="danger" loading={busy === 'delete'} onPress={deleteAccount} />
        </Stack>
      </Screen>
    </SafeAreaView>
  );
}
