/**
 * 포인트 허브: 잔액·무료 횟수·출석·위치 인증·휴대폰 인증·상점·내역.
 * 금액과 무료 횟수는 shared/economy.ts + config/economy 에서 온다 (서버와 같은 값).
 */

import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';

import {
  canClaimDaily,
  dayKey,
  mergeEconomy,
  remainingFreeIntros,
  remainingFreeLikes,
  SHOP_ITEMS,
  type ShopItemId,
} from '@shared/economy';

import { call, newRequestId, toApiError } from '@/firebase/api';
import { queries, refs } from '@/firebase/collections';
import { useDoc, useQuery } from '@/firebase/hooks';
import { formatDateTime, regionName, useT, type MessageKey, type T } from '@/i18n';
import { useClaims, useUid } from '@/store/session';
import { useWallet } from '@/store/wallet';
import { confirm, notify } from '@/ui/notify';
import { Badge, Button, Card, Divider, Loading, Row, Stack, Text } from '@/ui/primitives';
import { layout, space, useColors } from '@/ui/theme';
import { useNow } from '@/ui/useNow';

import { verifyLocation } from '../location/current';

const SHOP_IDS = Object.keys(SHOP_ITEMS) as ShopItemId[];

function reasonLabel(reason: string, t: T): string {
  if (reason.startsWith('purchase:')) {
    const id = reason.slice('purchase:'.length) as ShopItemId;
    return t('points.reasons.purchase', { item: SHOP_ITEMS[id] ? t(`shop.${id}.title`) : id });
  }
  const key = `points.reasons.${reason}` as MessageKey;
  const label = t(key);
  return label === key ? reason : label;
}

export function PointsHub() {
  const colors = useColors();
  const { t, tag, locale } = useT();
  const uid = useUid();
  const claims = useClaims();
  const { wallet, loading } = useWallet();
  const ecoDoc = useDoc(refs.economy()).data;
  const eco = mergeEconomy(ecoDoc);
  const ledger = useQuery(uid ? queries.ledger(uid) : null, uid ? `ledger:${uid}` : null);
  const [busy, setBusy] = useState<string | null>(null);
  const now = useNow();

  if (loading || !wallet) return <Loading />;
  const today = dayKey(now, eco.DAY_RESET_UTC_OFFSET_MIN);
  const canCheckIn = canClaimDaily(wallet.lastCheckInDate ?? undefined, today);
  const canLocation = canClaimDaily(wallet.lastLocationRewardDate ?? undefined, today);

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

  const checkIn = () =>
    run('checkin', async () => {
      const r = await call('dailyCheckIn', {});
      notify(r.rewarded > 0 ? t('points.checkInDone', { n: r.rewarded }) : t('points.checkInAlready'));
    });

  const location = () =>
    run('location', async () => {
      const r = await verifyLocation();
      notify(
        `📍 ${regionName(r.regionLabels, r.regionLabel, locale)}`,
        r.rewarded > 0 ? t('map.rewarded', { n: r.rewarded }) : t('map.alreadyRewarded'),
      );
    });

  const buy = (id: ShopItemId) =>
    run(`buy:${id}`, async () => {
      const item = t(`shop.${id}.title`);
      const ok = await confirm(
        t('points.buyTitle', { item }),
        t('points.buyBody', { cost: SHOP_ITEMS[id].cost, desc: t(`shop.${id}.desc`) }),
        t('points.buy'),
      );
      if (!ok) return;
      const r = await call('purchaseItem', { itemId: id, clientRequestId: newRequestId() });
      notify(t('points.bought'), r.until ? t('points.boughtUntil', { date: formatDateTime(r.until, tag) }) : undefined);
    });

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: space.lg, gap: space.lg, maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' }}
    >
      <Card style={{ backgroundColor: colors.pointSoft, borderColor: colors.pointCardBorder }}>
        <Text variant="caption">{t('points.balance')}</Text>
        <Text variant="title" color={colors.pointText}>
          {t('common.points', { n: wallet.balance })}
        </Text>
        <Row gap={space.lg} style={{ marginTop: space.sm, flexWrap: 'wrap' }}>
          <Text variant="caption">{t('points.freeIntrosLeft', { n: remainingFreeIntros(wallet.freeIntrosUsed, eco) })}</Text>
          <Text variant="caption">{t('points.freeLikesLeft', { n: remainingFreeLikes(wallet.dailyLikes, today, eco) })}</Text>
        </Row>
      </Card>

      <Text variant="heading">{t('points.earn')}</Text>
      <Card>
        <Stack gap={space.md}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Stack gap={2} style={{ flex: 1 }}>
              <Text variant="label">{t('points.checkIn')}</Text>
              <Text variant="caption">{t('points.checkInDesc', { n: eco.CHECKIN_REWARD })}</Text>
            </Stack>
            <Button
              title={canCheckIn ? t('points.claim') : t('points.claimed')}
              small
              disabled={!canCheckIn}
              loading={busy === 'checkin'}
              onPress={checkIn}
            />
          </Row>
          <Divider />
          <Row style={{ justifyContent: 'space-between' }}>
            <Stack gap={2} style={{ flex: 1 }}>
              <Text variant="label">{t('points.location')}</Text>
              <Text variant="caption">{t('points.locationDesc', { n: eco.LOCATION_REWARD })}</Text>
            </Stack>
            <Button
              title={canLocation ? t('points.verify') : t('points.refresh')}
              small
              kind={canLocation ? 'primary' : 'secondary'}
              loading={busy === 'location'}
              onPress={location}
            />
          </Row>
          <Divider />
          <Row style={{ justifyContent: 'space-between' }}>
            <Stack gap={2} style={{ flex: 1 }}>
              <Row gap={space.xs}>
                <Text variant="label">{t('points.phone')}</Text>
                {claims.phoneVerified ? <Badge label={t('common.done')} /> : null}
              </Row>
              <Text variant="caption">{t('points.phoneDesc', { n: eco.PHONE_VERIFIED_REWARD })}</Text>
            </Stack>
            {!claims.phoneVerified ? <Button title={t('points.verify')} small onPress={() => router.push('/profile/phone-verify')} /> : null}
          </Row>
        </Stack>
      </Card>

      <Text variant="heading">{t('points.shop')}</Text>
      <Stack gap={space.sm}>
        {SHOP_IDS.map((id) => {
          const until = wallet.perks[id] ?? 0;
          const owned = wallet.inventory[id] ?? 0;
          return (
            <Card key={id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Stack gap={2} style={{ flex: 1 }}>
                  <Text variant="label">{t(`shop.${id}.title`)}</Text>
                  <Text variant="caption">{t(`shop.${id}.desc`)}</Text>
                  {until > now ? (
                    <Text variant="caption" color={colors.success}>
                      {t('points.until', { date: formatDateTime(until, tag) })}
                    </Text>
                  ) : null}
                  {owned > 0 ? (
                    <Text variant="caption" color={colors.success}>
                      {t('points.owned', { n: owned })}
                    </Text>
                  ) : null}
                </Stack>
                <Button
                  title={t('common.points', { n: SHOP_ITEMS[id].cost })}
                  small
                  kind="secondary"
                  loading={busy === `buy:${id}`}
                  onPress={() => buy(id)}
                />
              </Row>
            </Card>
          );
        })}
      </Stack>

      <Text variant="heading">{t('points.history')}</Text>
      <Card>
        <Stack gap={space.sm}>
          {ledger.data.length === 0 ? <Text variant="caption">{t('points.noHistory')}</Text> : null}
          {ledger.data.map((e) => (
            <Row key={e.id} style={{ justifyContent: 'space-between' }}>
              <Stack gap={0} style={{ flex: 1 }}>
                <Text>{reasonLabel(e.reason, t)}</Text>
                <Text variant="caption">{formatDateTime(e.createdAt, tag)}</Text>
              </Stack>
              <Text variant="label" color={e.delta > 0 ? colors.success : colors.danger}>
                {e.delta > 0 ? '+' : '−'}
                {t('common.points', { n: Math.abs(e.delta) })}
              </Text>
            </Row>
          ))}
        </Stack>
      </Card>
    </ScrollView>
  );
}
