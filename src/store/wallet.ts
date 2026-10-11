/**
 * 내 지갑 실시간 구독. 메인 레이아웃이 한 번 구독을 걸고 헤더·포인트 허브가 같이 읽는다.
 */

import { onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { create } from 'zustand';

import type { Wallet } from '@shared/models';

import { refs } from '@/firebase/collections';

interface WalletState {
  wallet: Wallet | null;
  loading: boolean;
}

export const useWallet = create<WalletState>(() => ({ wallet: null, loading: true }));

let unsub: Unsubscribe | null = null;
let current: string | null = null;

export function subscribeWallet(uid: string | null): void {
  if (uid === current) return;
  unsub?.();
  unsub = null;
  current = uid;
  if (!uid) {
    useWallet.setState({ wallet: null, loading: false });
    return;
  }
  useWallet.setState({ loading: true });
  unsub = onSnapshot(
    refs.wallet(uid),
    (snap) => useWallet.setState({ wallet: snap.exists() ? snap.data() : null, loading: false }),
    () => useWallet.setState({ loading: false }),
  );
}

export const useBalance = () => useWallet((s) => s.wallet?.balance ?? 0);
