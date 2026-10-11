/**
 * 포인트 허브: 출석·상점·휴대폰 인증 보상.
 */

import { createHmac } from 'node:crypto';

import { defineSecret } from 'firebase-functions/params';

import { canClaimDaily, dayKey, SHOP_ITEMS, type ShopItemId } from '../../../shared/economy';
import { COL } from '../../../shared/models';
import { isRequestId } from '../../../shared/validators';
import { auth, db } from '../lib/admin';
import { appError } from '../lib/errors';
import { callable, need } from '../lib/guard';
import { loadEconomy, runWalletTx } from '../lib/ledger';
import { addBadge, internalRef, mergeClaims, privateRef, publicRef } from '../lib/users';

/** 전화번호 해시용 비밀값. 배포 전: firebase functions:secrets:set PHONE_HASH_PEPPER */
const PHONE_HASH_PEPPER = defineSecret('PHONE_HASH_PEPPER');

export const dailyCheckIn = callable('dailyCheckIn', { action: 'profile.edit' }, async (_req, ctx) => {
  const eco = await loadEconomy();
  return runWalletTx(ctx.uid, null, async (w) => {
    const today = dayKey(w.t, eco.DAY_RESET_UTC_OFFSET_MIN);
    if (!canClaimDaily(w.wallet.lastCheckInDate ?? undefined, today)) return { rewarded: 0, balance: w.balance };
    w.grant(eco.CHECKIN_REWARD, 'checkIn', today);
    w.patch({ lastCheckInDate: today });
    return { rewarded: eco.CHECKIN_REWARD, balance: w.balance };
  });
});

export const purchaseItem = callable('purchaseItem', { action: 'profile.edit' }, async ({ itemId, clientRequestId }, ctx) => {
  need(typeof itemId === 'string' && itemId in SHOP_ITEMS, 'unknown item');
  need(isRequestId(clientRequestId), 'bad clientRequestId');
  const item = SHOP_ITEMS[itemId as ShopItemId];

  return runWalletTx(ctx.uid, clientRequestId, async (w, tx) => {
    const pub = item.id === 'boost' ? await tx.get(publicRef(ctx.uid)) : null;
    w.charge(item.cost, `purchase:${item.id}`, clientRequestId);
    if (item.durationMin) {
      const from = Math.max(w.t, w.wallet.perks[item.id] ?? 0);
      const until = from + item.durationMin * 60_000;
      w.patch({ perks: { ...w.wallet.perks, [item.id]: until } });
      if (pub?.exists) tx.update(publicRef(ctx.uid), { boostUntil: until });
      return { balance: w.balance, until };
    }
    w.patch({ inventory: { ...w.wallet.inventory, [item.id]: (w.wallet.inventory[item.id] ?? 0) + 1 } });
    return { balance: w.balance, until: null };
  });
});

export function hashPhone(phone: string, pepper: string): string {
  return createHmac('sha256', pepper || 'dev-only-pepper').update(phone).digest('hex');
}

/**
 * 앱이 JS SDK 로 전화번호를 계정에 연결(link)한 뒤 부른다.
 * 클라이언트 말을 믿지 않고 Auth 에서 phoneNumber 를 직접 읽는다.
 * 같은 번호로 여러 계정을 인증하지 못하게 phone_index 에 해시를 남긴다.
 */
export const claimPhoneVerified = callable(
  'claimPhoneVerified',
  { action: 'profile.edit', secrets: [PHONE_HASH_PEPPER] },
  async (_req, ctx) => {
    const user = await auth.getUser(ctx.uid);
    if (!user.phoneNumber) throw appError('NO_PHONE');
    const hash = hashPhone(user.phoneNumber, PHONE_HASH_PEPPER.value());
    const eco = await loadEconomy();
    const indexRef = db.collection(COL.phoneIndex).doc(hash);

    const res = await runWalletTx(ctx.uid, null, async (w, tx) => {
      const [idx, internal, pub] = await Promise.all([
        tx.get(indexRef),
        tx.get(internalRef(ctx.uid)),
        tx.get(publicRef(ctx.uid)),
      ]);
      const owner = idx.get('uid') as string | null | undefined;
      if (owner && owner !== ctx.uid) throw appError('PHONE_IN_USE');
      // 탈퇴 후 같은 번호로 재가입하면 인증은 되지만 보상은 다시 주지 않는다 (index.rewarded)
      const alreadyRewarded = Boolean(internal.get('rewards.phoneVerified') || idx.get('rewarded'));
      tx.set(indexRef, { uid: ctx.uid, rewarded: true, createdAt: w.t });
      tx.set(privateRef(ctx.uid), { phoneHash: hash }, { merge: true });
      if (pub.exists) tx.update(publicRef(ctx.uid), { badges: addBadge(pub.get('badges'), 'phone') });
      let rewarded = 0;
      if (!alreadyRewarded) {
        rewarded = eco.PHONE_VERIFIED_REWARD;
        w.grant(rewarded, 'phoneVerified');
        tx.set(internalRef(ctx.uid), { rewards: { phoneVerified: true } }, { merge: true });
      }
      return { rewarded };
    });

    await mergeClaims(ctx.uid, { phoneVerified: true });
    return res;
  },
);
