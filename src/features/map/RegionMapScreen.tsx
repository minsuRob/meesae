/**
 * 메뉴 2: 지도. 구 단위로 몇 명이 있는지만 보여 준다. 개인 좌표는 어디에도 그리지 않는다.
 * 마커 위치는 서버가 정한 geohash 5자리 격자 중심이다.
 */

import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import type { RegionStat } from '@shared/models';

import { call, toApiError } from '@/firebase/api';
import { useAsync } from '@/firebase/hooks';
import { verifyLocation } from '@/features/location/current';
import { MainHeader } from '@/features/profile/MainHeader';
import { regionName, useT } from '@/i18n';
import { notify } from '@/ui/notify';
import { Button, Card, Empty, Loading, Row, Stack, Text } from '@/ui/primitives';
import { space, useColors } from '@/ui/theme';

import { MapView } from './MapView';
import type { MapMarker } from './types';

const COUNTRY_VIEW: Record<string, { lat: number; lng: number; zoom: number }> = {
  KR: { lat: 36.4, lng: 127.9, zoom: 6 },
  JP: { lat: 36.2, lng: 138.3, zoom: 4.5 },
  US: { lat: 39.8, lng: -98.6, zoom: 3 },
};

export function RegionMapScreen() {
  const colors = useColors();
  const { t, locale } = useT();
  const stats = useAsync(() => call('getRegionStats', {}), 'regions');
  const regions: RegionStat[] | null = stats.data?.regions ?? null;
  const mine = stats.data?.mine ?? null;
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const markers = useMemo<MapMarker[]>(
    () =>
      (regions ?? []).map((r) => ({
        id: r.regionKey,
        lat: r.center.lat,
        lng: r.center.lng,
        label: String(r.count),
        weight: r.count,
        highlight: r.regionKey === mine,
      })),
    [regions, mine],
  );

  const myRegion = regions?.find((r) => r.regionKey === mine);
  const country = mine?.split('~')[0] ?? 'KR';
  const view = myRegion
    ? { lat: myRegion.center.lat, lng: myRegion.center.lng, zoom: 10 }
    : (COUNTRY_VIEW[country] ?? { lat: 20, lng: 0, zoom: 1.5 });
  const sel = regions?.find((r) => r.regionKey === selected);
  const nameOf = (r: RegionStat) => regionName(r.labels, r.label, locale) ?? r.label;

  async function verify() {
    setBusy(true);
    try {
      const res = await verifyLocation();
      notify(
        `📍 ${regionName(res.regionLabels, res.regionLabel, locale)}`,
        res.rewarded > 0 ? t('map.rewarded', { n: res.rewarded }) : t('map.alreadyRewarded'),
      );
      stats.reload();
    } catch (e) {
      notify(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <MainHeader title={t('map.title')} right={<Button title={t('map.verify')} small kind="secondary" onPress={verify} loading={busy} />} />
      {stats.error ? (
        <Empty
          title={t('map.loadFailed')}
          body={toApiError(stats.error).message}
          action={<Button title={t('common.retry')} small onPress={stats.reload} />}
        />
      ) : !regions ? (
        <Loading />
      ) : (
        <View style={{ flex: 1 }}>
          <MapView center={view} zoom={view.zoom} markers={markers} onMarkerPress={setSelected} />
          <View style={{ position: 'absolute', left: space.lg, right: space.lg, bottom: space.lg }}>
            <Card>
              {sel ? (
                <Row style={{ justifyContent: 'space-between' }}>
                  <Stack gap={2} style={{ flex: 1 }}>
                    <Text variant="heading">{nameOf(sel)}</Text>
                    <Text variant="caption">{t('map.regionCount', { n: sel.count })}</Text>
                  </Stack>
                  {sel.regionKey === mine ? (
                    <Button title={t('map.seeLocals')} small onPress={() => router.push({ pathname: '/chat', params: { scope: 'district' } })} />
                  ) : null}
                </Row>
              ) : (
                <Text variant="caption">
                  {myRegion ? t('map.myRegion', { name: nameOf(myRegion) }) : t('map.noRegion')} · {t('map.tapHint')}
                </Text>
              )}
            </Card>
          </View>
        </View>
      )}
    </View>
  );
}
