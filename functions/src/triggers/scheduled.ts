/**
 * 주기 정리: 만료된 위치공유·레이트리밋 창·멱등 기록.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';

import { COL } from '../../../shared/models';
import { db } from '../lib/admin';

async function deleteWhereExpired(q: FirebaseFirestore.Query): Promise<number> {
  const snap = await q.limit(400).get();
  if (snap.empty) return 0;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

export async function cleanupExpired(t: number): Promise<{ shares: number; rates: number; requests: number }> {
  const [shares, rates, requests] = await Promise.all([
    deleteWhereExpired(db.collection(COL.locationShares).where('expiresAt', '<', t - 10 * 60_000)),
    deleteWhereExpired(db.collection(COL.rateLimits).where('expiresAt', '<', t)),
    deleteWhereExpired(db.collectionGroup(COL.requests).where('expiresAt', '<', t)),
  ]);
  return { shares, rates, requests };
}

export const cleanupExpiredShares = onSchedule({ schedule: 'every 60 minutes', region: 'asia-northeast3' }, async () => {
  await cleanupExpired(Date.now());
});
