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
import { Button, Card, ListGroup, ListRow, Pill, Row, SkeletonList, Stack, Text, toast, type IconName } from '@/ui/primitives';
import { layout, space, useColors } from '@/ui/theme';
import { useNow } from '@/ui/useNow';

import { verifyLocation } from '../location/current';

const SHOP_IDS = Object.keys(SHOP_ITEMS) as ShopItemId[];
const SHOP_ICON: Record<ShopItemId, IconName> = {
  boost: 'flash-outline',
  superLike: 'star-outline',
  readReceipt: 'eye-outline',
  extraFilters: 'options-outline',
};

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

  if (loading || !wallet) return <SkeletonList kind="row" count={4} />;
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
      toast(r.rewarded > 0 ? t('points.checkInDone', { n: r.rewarded }) : t('points.checkInAlready'));
    });

  const location = () =>
    run('location', async () => {
      const r = await verifyLocation();
      notify(
        regionName(r.regionLabels, r.regionLabel, locale) ?? '',
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
      contentContainerStyle={{ padding: space.lg, gap: space.xl, maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' }}
    >
      <Card style={{ padding: space.xl }}>
        <Text variant="label" tone="muted">
          {t('points.balance')}
        </Text>
        <Text variant="display" style={{ fontSize: 40, lineHeight: 48, marginTop: space.xs }}>
          {t('common.points', { n: wallet.balance })}
        </Text>
        <Row gap={space.sm} style={{ marginTop: space.md, flexWrap: 'wrap' }}>
          <Pill label={t('points.freeIntrosLeft', { n: remainingFreeIntros(wallet.freeIntrosUsed, eco) })} tone="neutral" />
          <Pill label={t('points.freeLikesLeft', { n: remainingFreeLikes(wallet.dailyLikes, today, eco) })} tone="neutral" />
        </Row>
      </Card>

      <ListGroup title={t('points.earn')}>
        <ListRow
          icon="calendar-outline"
          title={t('points.checkIn')}
          subtitle={t('points.checkInDesc', { n: eco.CHECKIN_REWARD })}
          trailing={
            <Button
              title={canCheckIn ? t('points.claim') : t('points.claimed')}
              small
              pill
              disabled={!canCheckIn}
              loading={busy === 'checkin'}
              onPress={checkIn}
            />
          }
        />
        <ListRow
          icon="location-outline"
          title={t('points.location')}
          subtitle={t('points.locationDesc', { n: eco.LOCATION_REWARD })}
          trailing={
            <Button
              title={canLocation ? t('points.verify') : t('points.refresh')}
              small
              pill
              kind={canLocation ? 'primary' : 'secondary'}
              loading={busy === 'location'}
              onPress={location}
            />
          }
        />
        <ListRow
          icon="phone-portrait-outline"
          title={t('points.phone')}
          subtitle={t('points.phoneDesc', { n: eco.PHONE_VERIFIED_REWARD })}
          trailing={
            claims.phoneVerified ? (
              <Pill label={t('common.done')} tone="success" icon="checkmark-circle" />
            ) : (
              <Button title={t('points.verify')} small pill onPress={() => router.push('/profile/phone-verify')} />
            )
          }
        />
      </ListGroup>

      <ListGroup title={t('points.shop')}>
        {SHOP_IDS.map((id) => {
          const until = wallet.perks[id] ?? 0;
          const owned = wallet.inventory[id] ?? 0;
          const extra =
            until > now ? t('points.until', { date: formatDateTime(until, tag) }) : owned > 0 ? t('points.owned', { n: owned }) : null;
          return (
            <ListRow
              key={id}
              icon={SHOP_ICON[id]}
              title={t(`shop.${id}.title`)}
              subtitle={extra ? `${t(`shop.${id}.desc`)}\n${extra}` : t(`shop.${id}.desc`)}
              trailing={
                <Button
                  title={t('common.points', { n: SHOP_ITEMS[id].cost })}
                  small
                  pill
                  kind="secondary"
                  loading={busy === `buy:${id}`}
                  onPress={() => buy(id)}
                />
              }
            />
          );
        })}
      </ListGroup>

      <Stack gap={space.sm}>
        <Text variant="heading" style={{ marginBottom: space.xs }}>
          {t('points.history')}
        </Text>
        {ledger.data.length === 0 ? (
          <Text variant="bodySm" tone="muted">
            {t('points.noHistory')}
          </Text>
        ) : (
          <ListGroup>
            {ledger.data.map((e) => (
              <ListRow
                key={e.id}
                title={reasonLabel(e.reason, t)}
                subtitle={formatDateTime(e.createdAt, tag)}
                trailing={
                  <Text variant="subtitle" color={e.delta > 0 ? colors.success : colors.text}>
                    {e.delta > 0 ? '+' : '-'}
                    {t('common.points', { n: Math.abs(e.delta) })}
                  </Text>
                }
              />
            ))}
          </ListGroup>
        )}
      </Stack>
    </ScrollView>
  );
}
