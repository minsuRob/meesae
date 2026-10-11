/**
 * 로그인 세션 + 커스텀 클레임. AuthGate 가 이 상태로 화면을 고른다.
 */

import { onIdTokenChanged, signOut as fbSignOut, type User } from 'firebase/auth';
import { create } from 'zustand';

import { pickClaims, type Claims } from '@shared/permissions';

import { auth } from '@/firebase/config';
import { signOutNative } from '@/firebase/auth/social';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface SessionState {
  status: Status;
  user: User | null;
  claims: Claims;
  /** 서버가 클레임을 바꾼 뒤(온보딩 완료·휴대폰 인증) 새 토큰을 받는다 */
  refreshClaims: () => Promise<Claims>;
  signOut: () => Promise<void>;
}

export const useSession = create<SessionState>((set) => ({
  status: 'loading',
  user: null,
  claims: {},
  refreshClaims: async () => {
    const user = auth().currentUser;
    if (!user) return {};
    const token = await user.getIdTokenResult(true);
    const claims = pickClaims(token.claims);
    set({ claims });
    return claims;
  },
  signOut: async () => {
    await signOutNative();
    await fbSignOut(auth());
  },
}));

let started = false;

/** 앱 시작 때 한 번 부른다 */
export function startSessionListener(): void {
  if (started) return;
  started = true;
  onIdTokenChanged(auth(), async (user) => {
    if (!user) {
      useSession.setState({ status: 'signedOut', user: null, claims: {} });
      return;
    }
    const token = await user.getIdTokenResult();
    useSession.setState({ status: 'signedIn', user, claims: pickClaims(token.claims) });
  });
}

export const useUid = () => useSession((s) => s.user?.uid ?? null);
export const useClaims = () => useSession((s) => s.claims);
