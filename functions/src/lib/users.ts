/**
 * 사용자 문서·클레임·차단 관계를 다루는 공통 함수.
 */

import { FieldValue, type Transaction } from 'firebase-admin/firestore';

import { COL, type Badge, type RegionStat, type UserPublic } from '../../../shared/models';
import type { Localized } from '../../../shared/i18n';
import type { Claims } from '../../../shared/permissions';
import { coarsen, type LatLng } from '../../../shared/region';
import { auth, db } from './admin';

export const publicRef = (uid: string) => db.collection(COL.usersPublic).doc(uid);
export const privateRef = (uid: string) => db.collection(COL.usersPrivate).doc(uid);
export const internalRef = (uid: string) => db.collection(COL.usersInternal).doc(uid);
export const walletRef = (uid: string) => db.collection(COL.wallets).doc(uid);
export const blockRef = (owner: string, target: string) =>
  db.collection(COL.blocks).doc(owner).collection(COL.blockTargets).doc(target);

/** 기존 클레임을 지우지 않고 합친다 */
export async function mergeClaims(uid: string, patch: Partial<Claims>): Promise<void> {
  const user = await auth.getUser(uid);
  await auth.setCustomUserClaims(uid, { ...(user.customClaims ?? {}), ...patch });
}

export async function getPublic(uid: string): Promise<UserPublic | null> {
  const snap = await publicRef(uid).get();
  return snap.exists ? (snap.data() as UserPublic) : null;
}

/** 둘 중 누구라도 상대를 차단했는가 (트랜잭션 안에서) */
export async function isBlockedEitherTx(tx: Transaction, a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([tx.get(blockRef(a, b)), tx.get(blockRef(b, a))]);
  return x.exists || y.exists;
}

export async function isBlockedEither(a: string, b: string): Promise<boolean> {
  const [x, y] = await db.getAll(blockRef(a, b), blockRef(b, a));
  return x.exists || y.exists;
}

/** 내가 차단했거나 나를 차단한 사람 목록 (추천에서 뺀다) */
export async function blockedSet(uid: string): Promise<Set<string>> {
  const [mine, theirs] = await Promise.all([
    db.collection(COL.blocks).doc(uid).collection(COL.blockTargets).select().get(),
    db.collectionGroup(COL.blockTargets).where('targetUid', '==', uid).select('ownerUid').get(),
  ]);
  const out = new Set<string>();
  mine.docs.forEach((d) => out.add(d.id));
  theirs.docs.forEach((d) => out.add(d.get('ownerUid') as string));
  return out;
}

export function addBadge(badges: Badge[] | undefined, b: Badge): Badge[] {
  return [...new Set([...(badges ?? []), b])];
}

/**
 * 지도 집계. 지역이 바뀌면 이전 지역 -1, 새 지역 +1.
 * center 는 처음 들어온 사람의 geohash 5자리 격자 중심 (약 5km). 개인 좌표가 아니다.
 */
export function moveRegionStat(
  tx: Transaction,
  from: string | null,
  to: { regionKey: string; label: string; labels: Localized; countryCode: string; location: LatLng } | null,
): void {
  if (from && from === to?.regionKey) return;
  if (from) {
    tx.set(db.collection(COL.regionStats).doc(from), { count: FieldValue.increment(-1) }, { merge: true });
  }
  if (to) {
    const stat: Omit<RegionStat, 'count' | 'center'> & { count: FieldValue } = {
      regionKey: to.regionKey,
      label: to.label,
      labels: to.labels,
      countryCode: to.countryCode,
      count: FieldValue.increment(1),
    };
    tx.set(db.collection(COL.regionStats).doc(to.regionKey), stat, { merge: true });
  }
}

/** region_stats 에 center 가 없으면 채운다 (트랜잭션 밖, 첫 진입 때 한 번) */
export async function ensureRegionCenter(regionKey: string, location: LatLng): Promise<void> {
  const ref = db.collection(COL.regionStats).doc(regionKey);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.get('center')) tx.set(ref, { center: coarsen(location) }, { merge: true });
  });
}
