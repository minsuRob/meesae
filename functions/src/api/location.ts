/**
 * 위치. 좌표는 users_private 에만 저장하고, 공개 문서에는 구 라벨·regionKey 만 둔다.
 */

import { FieldValue } from 'firebase-admin/firestore';

import { canClaimDaily, dayKey } from '../../../shared/economy';
import { COL, type RegionStat, type UserPrivate, type UserPublic } from '../../../shared/models';
import {
  admin1KeyOf,
  geohashEncode,
  isValidLatLng,
  regionKeyOf,
  regionLabelOf,
  speedKmh,
} from '../../../shared/region';
import { db } from '../lib/admin';
import { appError } from '../lib/errors';
import { reverseGeocode } from '../lib/geocode';
import { callable, need } from '../lib/guard';
import { loadEconomy, runWalletTx } from '../lib/ledger';
import { RATE } from '../lib/rateLimit';
import { addBadge, ensureRegionCenter, internalRef, moveRegionStat, privateRef, publicRef } from '../lib/users';

/** 온보딩 중에도 부른다. 그래서 onboarded 를 요구하지 않는다. */
export const updateLocation = callable('updateLocation', { rate: RATE.location }, async (req, ctx) => {
  const p = { lat: req.lat, lng: req.lng };
  need(isValidLatLng(p), 'bad coordinates');
  const accuracy = typeof req.accuracy === 'number' && req.accuracy >= 0 ? req.accuracy : 9999;

  const region = await reverseGeocode(p);
  if (!region) throw appError('LOCATION_UNKNOWN');
  const regionKey = regionKeyOf(region.parts);
  const regionLabel = regionLabelOf(region.parts);
  const regionLabels = region.labels;
  const eco = await loadEconomy();

  const res = await runWalletTx(ctx.uid, null, async (w, tx) => {
    const [privSnap, pubSnap] = await Promise.all([tx.get(privateRef(ctx.uid)), tx.get(publicRef(ctx.uid))]);
    const prev = privSnap.data() as Partial<UserPrivate> | undefined;
    const t = w.t;

    // 보상 조건: 정확도가 충분하고, 직전 위치에서 비현실적인 속도로 움직이지 않았다
    let plausible = accuracy <= eco.LOCATION_MAX_ACCURACY_M;
    if (plausible && prev?.location) {
      plausible = speedKmh(prev.location, prev.location.verifiedAt, p, t) <= eco.LOCATION_MAX_SPEED_KMH;
      if (!plausible) tx.set(internalRef(ctx.uid), { riskScore: FieldValue.increment(1) }, { merge: true });
    }

    tx.set(
      privateRef(ctx.uid),
      {
        uid: ctx.uid,
        location: { ...p, geohash: geohashEncode(p, 9), accuracy, verifiedAt: t },
        regionKey,
        regionLabel,
        regionLabels,
      },
      { merge: true },
    );

    if (pubSnap.exists) {
      const pub = pubSnap.data() as UserPublic;
      tx.update(publicRef(ctx.uid), {
        regionKey,
        regionLabel,
        regionLabels,
        admin1Key: admin1KeyOf(regionKey),
        lastActiveAt: t,
        badges: plausible ? addBadge(pub.badges, 'location') : pub.badges,
      });
      if (pub.visible) {
        moveRegionStat(tx, pub.regionKey, { regionKey, label: regionLabel, labels: regionLabels, countryCode: pub.countryCode, location: p });
      }
    }

    const today = dayKey(t, eco.DAY_RESET_UTC_OFFSET_MIN);
    let rewarded = 0;
    if (plausible && canClaimDaily(w.wallet.lastLocationRewardDate ?? undefined, today)) {
      rewarded = eco.LOCATION_REWARD;
      w.grant(rewarded, 'locationReward', regionKey);
      w.patch({ lastLocationRewardDate: today });
    }
    return { regionLabel, regionLabels, regionKey, rewarded, balance: w.balance };
  });

  await ensureRegionCenter(regionKey, p);
  return res;
});

export const getRegionStats = callable('getRegionStats', { action: 'map.view' }, async (req, ctx) => {
  const pub = (await publicRef(ctx.uid).get()).data() as UserPublic | undefined;
  const country = (typeof req.countryCode === 'string' ? req.countryCode : pub?.countryCode ?? 'KR').toUpperCase();
  const snap = await db
    .collection(COL.regionStats)
    .where('countryCode', '==', country)
    .where('count', '>', 0)
    .orderBy('count', 'desc')
    .limit(300)
    .get();
  const regions = snap.docs
    .map((d) => d.data() as RegionStat)
    .filter((r) => r.center)
    .map((r) => ({
      regionKey: r.regionKey,
      label: r.label,
      labels: r.labels ?? {},
      countryCode: r.countryCode,
      center: r.center,
      count: r.count,
    }));
  if (!pub) throw appError('NOT_ONBOARDED');
  return { regions, mine: pub.regionKey };
});
