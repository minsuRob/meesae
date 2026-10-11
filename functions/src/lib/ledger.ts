/**
 * 포인트 원장. 모든 증감은 여기를 지난다.
 *
 *   잔액 확인 → 차감/지급 → 원장 기록 → (호출자의) 행동 수행
 *
 * 하나의 Firestore 트랜잭션 안에서 일어나고, clientRequestId 가 있으면
 * `wallets/{uid}/requests/{id}` 에 결과를 남겨 같은 요청을 다시 보내도 한 번만 처리된다.
 *
 * 트랜잭션 규칙: 콜백은 읽기를 모두 끝낸 뒤에 쓰기를 한다. 지갑 쓰기는 콜백이 끝난 뒤 한꺼번에 한다.
 */

import type { Transaction } from 'firebase-admin/firestore';

import { mergeEconomy, type Economy, type LedgerReason } from '../../../shared/economy';
import { COL, type LedgerEntry, type Wallet } from '../../../shared/models';
import { db, now } from './admin';
import { appError } from './errors';

export function emptyWallet(uid: string, t: number): Wallet {
  return {
    uid,
    balance: 0,
    freeIntrosUsed: 0,
    dailyLikes: { date: '', count: 0 },
    lastCheckInDate: null,
    lastLocationRewardDate: null,
    inventory: {},
    perks: {},
    updatedAt: t,
  };
}

export class WalletTx {
  readonly wallet: Wallet;
  private entries: LedgerEntry[] = [];
  private dirty = false;

  constructor(
    readonly uid: string,
    wallet: Wallet,
    readonly t: number,
  ) {
    this.wallet = { ...wallet, inventory: { ...wallet.inventory }, perks: { ...wallet.perks } };
  }

  get balance(): number {
    return this.wallet.balance;
  }

  /** 잔액이 모자라면 INSUFFICIENT_POINTS 를 던진다 */
  charge(amount: number, reason: LedgerReason, refId: string | null = null): void {
    if (amount <= 0) return;
    if (this.wallet.balance < amount) {
      throw appError('INSUFFICIENT_POINTS', { need: amount, balance: this.wallet.balance });
    }
    this.move(-amount, reason, refId);
  }

  grant(amount: number, reason: LedgerReason, refId: string | null = null): void {
    if (amount <= 0) return;
    this.move(amount, reason, refId);
  }

  /** 잔액 외 필드 변경 (무료 횟수 카운터 등) */
  patch(fields: Partial<Omit<Wallet, 'uid' | 'balance'>>): void {
    Object.assign(this.wallet, fields);
    this.dirty = true;
  }

  private move(delta: number, reason: LedgerReason, refId: string | null): void {
    this.wallet.balance += delta;
    this.entries.push({ delta, balanceAfter: this.wallet.balance, reason, refId, createdAt: this.t });
    this.dirty = true;
  }

  /** @internal runWalletTx 가 부른다 */
  commit(tx: Transaction): void {
    if (!this.dirty) return;
    const ref = db.collection(COL.wallets).doc(this.uid);
    tx.set(ref, { ...this.wallet, updatedAt: this.t });
    for (const e of this.entries) tx.set(ref.collection(COL.ledger).doc(), e);
  }
}

let economyCache: { value: Economy; at: number } | null = null;

/** config/economy 를 기본값 위에 덮은 값. 인스턴스마다 5분 캐시 */
export async function loadEconomy(): Promise<Economy> {
  if (economyCache && Date.now() - economyCache.at < 300_000) return economyCache.value;
  const snap = await db.collection(COL.config).doc('economy').get();
  economyCache = { value: mergeEconomy(snap.data()), at: Date.now() };
  return economyCache.value;
}

/** 테스트에서 config/economy 를 바꾼 뒤 부른다 */
export function resetEconomyCache(): void {
  economyCache = null;
}

/**
 * 지갑을 읽고 콜백을 실행한 뒤 지갑·원장·멱등 기록을 쓴다.
 * 같은 clientRequestId 로 다시 오면 콜백을 실행하지 않고 처음 결과를 돌려준다.
 */
export async function runWalletTx<T extends object>(
  uid: string,
  clientRequestId: string | null,
  fn: (w: WalletTx, tx: Transaction) => Promise<T>,
): Promise<T> {
  const walletRef = db.collection(COL.wallets).doc(uid);
  const reqRef = clientRequestId ? walletRef.collection(COL.requests).doc(clientRequestId) : null;

  return db.runTransaction(async (tx) => {
    if (reqRef) {
      const prev = await tx.get(reqRef);
      if (prev.exists) return prev.get('result') as T;
    }
    const t = now();
    const snap = await tx.get(walletRef);
    const w = new WalletTx(uid, (snap.data() as Wallet | undefined) ?? emptyWallet(uid, t), t);
    if (!snap.exists) w.patch({});

    const result = await fn(w, tx);

    w.commit(tx);
    if (reqRef) tx.set(reqRef, { result, createdAt: t, expiresAt: t + 7 * 86_400_000 });
    return result;
  });
}
