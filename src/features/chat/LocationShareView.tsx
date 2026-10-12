/**
 * 실시간 위치공유 화면. 열려 있는 동안 20초마다 내 위치를 올린다 (휴대폰 인증한 경우만).
 * 만료되면 Rules 가 읽기를 막아 화면이 '끝났어요' 로 바뀐다.
 */

import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import type { UserPublic } from '@shared/models';
import { can } from '@shared/permissions';

import { call, toApiError } from '@/firebase/api';
import { refs } from '@/firebase/collections';
import { useDoc } from '@/firebase/hooks';
import { useT } from '@/i18n';
import { useClaims, useUid } from '@/store/session';
import { notify } from '@/ui/notify';
import { Button, Card, Empty, Loading, Row, Text } from '@/ui/primitives';
import { space, useColors } from '@/ui/theme';

import { currentCoords } from '../location/current';
import { MapView } from '../map/MapView';
import type { MapMarker } from '../map/types';

const INTERVAL_MS = 20_000;

function useNickname(uid: string | undefined) {
  return (useDoc(uid ? refs.userPublic(uid) : null).data as UserPublic | null)?.nickname;
}

export function LocationShareView({ id }: { id: string }) {
  const colors = useColors();
  const { t } = useT();
  const me = useUid();
  const claims = useClaims();
  const share = useDoc(refs.share(id));
  const [now, setNow] = useState(() => Date.now());
  const peerUid = share.data?.members.find((m) => m !== me);
  const peerName = useNickname(peerUid);

  const active = Boolean(share.data && share.data.expiresAt > now);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!active || !can(claims, 'location.liveShare')) return;
    const tick = () =>
      currentCoords()
        .then((c) => call('updateSharedLocation', { shareId: id, lat: c.lat, lng: c.lng }))
        .catch(() => undefined);
    const timer = setInterval(tick, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [active, claims, id]);

  const markers = useMemo<MapMarker[]>(() => {
    if (!share.data) return [];
    return Object.entries(share.data.positions ?? {}).map(([uid, p]) => ({
      id: uid,
      lat: p.lat,
      lng: p.lng,
      label: uid === me ? t('share.me') : (peerName?.slice(0, 2) ?? '?'),
      highlight: uid === me,
    }));
  }, [share.data, me, peerName, t]);

  if (share.loading) return <Loading />;
  if (!share.data || !active) {
    return <Empty icon="navigate-outline" title={t('share.ended')} action={<Button title={t('common.back')} small kind="secondary" onPress={() => router.back()} />} />;
  }

  const first = markers[0] ?? { lat: 37.5665, lng: 126.978 };
  const left = Math.max(0, Math.round((share.data.expiresAt - now) / 60_000));

  async function stop() {
    try {
      await call('stopLocationShare', { shareId: id });
      router.back();
    } catch (e) {
      notify(toApiError(e).message);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <MapView center={first} zoom={14} markers={markers} />
      <View style={{ position: 'absolute', left: space.lg, right: space.lg, bottom: space.xl }}>
        <Card elevation={2} outlined={false}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text variant="label" style={{ flex: 1 }}>
              {t('share.status', { name: peerName ?? t('share.partner'), minutes: left })}
            </Text>
            <Button title={t('share.stop')} small pill kind="danger" onPress={stop} />
          </Row>
        </Card>
      </View>
    </View>
  );
}
