/**
 * 온보딩 중 모으는 값. 새로고침·앱 재시작에도 이어지도록 기기에 저장한다.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Localized } from '@shared/i18n';
import type { OnboardingDraft } from '@shared/onboarding-schema';

export interface DraftRegion {
  label: string;
  labels: Localized;
}

interface DraftState {
  /** 이 초안을 만든 계정. 다른 계정으로 로그인하면 비운다 */
  ownerUid: string | null;
  draft: OnboardingDraft;
  /** 위치 단계에서 받은 지역 이름 (표시용, 언어별) */
  region: DraftRegion | null;
  update: (patch: Partial<OnboardingDraft>) => void;
  setRegion: (region: DraftRegion | null) => void;
  reset: () => void;
  claim: (uid: string) => void;
}

export const useDraft = create<DraftState>()(
  persist(
    (set, get) => ({
      ownerUid: null,
      draft: {},
      region: null,
      update: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      setRegion: (region) => set({ region }),
      reset: () => set({ draft: {}, region: null }),
      claim: (uid) => {
        if (get().ownerUid !== uid) set({ ownerUid: uid, draft: {}, region: null });
      },
    }),
    { name: 'meesae.onboarding', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
