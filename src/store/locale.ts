/**
 * 언어 선택: 시스템 따라가기 또는 지원 언어 중 하나. 기기에 저장한다.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Locale } from '@shared/i18n';

export type LocalePref = 'system' | Locale;

interface LocaleState {
  pref: LocalePref;
  setPref: (pref: LocalePref) => void;
}

export const useLocalePref = create<LocaleState>()(
  persist(
    (set) => ({
      pref: 'system',
      setPref: (pref) => set({ pref }),
    }),
    { name: 'meesae.locale', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
