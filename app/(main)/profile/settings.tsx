import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COUNTRIES } from '@shared/countries';

import { call, toApiError } from '@/firebase/api';
import { verifyLocation } from '@/features/location/current';
import { useMyProfile } from '@/features/profile/useMyProfile';
import { AppearanceRow, LanguageRow } from '@/features/settings/Preferences';
import { countryName, regionName, useT } from '@/i18n';
import { useSession } from '@/store/session';
import { confirm, notify } from '@/ui/notify';
import { Button, Chip, HeaderBar, ListGroup, ListRow, Row, Sheet, Stack, Text } from '@/ui/primitives';
import { layout, space, useColors } from '@/ui/theme';

export default function SettingsScreen() {
  const colors = useColors();
  const { t, locale } = useT();
  const me = useMyProfile();
  const signOut = useSession((s) => s.signOut);
  const [busy, setBusy] = useState<string | null>(null);
  const [countryOpen, setCountryOpen] = useState(false);

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
      setCountryOpen(false);
    });

  const deleteAccount = () =>
    run('delete', async () => {
      if (!(await confirm(t('settings.deleteTitle'), t('settings.deleteBody'), t('settings.deleteOk')))) return;
      if (!(await confirm(t('settings.deleteFinalTitle'), t('settings.deleteFinalBody'), t('settings.deleteFinalOk')))) return;
      await call('deleteAccount', { confirm: 'DELETE' });
      await signOut();
    });

  const myRegion = me ? regionName(me.regionLabels, me.regionLabel, locale) : null;
  const myCountry = COUNTRIES.find((c) => c.code === me?.countryCode);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <HeaderBar title={t('settings.title')} center onBack={() => router.back()} backLabel={t('common.back')} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.xl, maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' }}>
        <ListGroup title={t('settings.sectionPreferences')}>
          <LanguageRow />
          <AppearanceRow />
        </ListGroup>

        <ListGroup title={t('settings.sectionRegion')}>
          <ListRow
            icon="flag-outline"
            title={t('settings.country')}
            subtitle={t('settings.countryHint')}
            value={myCountry ? `${myCountry.flag} ${countryName(myCountry.code, t)}` : ''}
            chevron
            onPress={() => setCountryOpen(true)}
          />
          <ListRow
            icon="location-outline"
            title={t('settings.region')}
            subtitle={myRegion ?? t('settings.regionNone')}
            trailing={
              <Button
                title={t('settings.reverify')}
                small
                pill
                kind="secondary"
                loading={busy === 'loc'}
                onPress={() =>
                  run('loc', async () => {
                    const r = await verifyLocation();
                    notify(regionName(r.regionLabels, r.regionLabel, locale) ?? '', r.rewarded ? t('map.rewarded', { n: r.rewarded }) : undefined);
                  })
                }
              />
            }
          />
        </ListGroup>

        <ListGroup title={t('settings.sectionAccount')}>
          <ListRow icon="log-out-outline" title={t('settings.signOut')} onPress={() => run('signout', signOut)} />
          <ListRow icon="trash-outline" title={t('settings.deleteAccount')} destructive onPress={deleteAccount} />
        </ListGroup>
      </ScrollView>

      <Sheet visible={countryOpen} onClose={() => setCountryOpen(false)} title={t('settings.country')} closeLabel={t('common.close')}>
        <Stack gap={space.md} style={{ paddingVertical: space.sm }}>
          <Text variant="bodySm" tone="muted">
            {t('settings.countryHint')}
          </Text>
          <Row style={{ flexWrap: 'wrap' }}>
            {COUNTRIES.map((c) => (
              <Chip key={c.code} label={`${c.flag} ${countryName(c.code, t)}`} selected={me?.countryCode === c.code} onPress={() => setCountry(c.code)} />
            ))}
          </Row>
        </Stack>
      </Sheet>
    </SafeAreaView>
  );
}
