/**
 * 화면 모드 선택: 시스템 따라가기 / 라이트 / 다크. 기기에 저장한다.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePref = 'system' | 'light' | 'dark';

interface ThemeState {
  pref: ThemePref;
  setPref: (pref: ThemePref) => void;
}

export const useThemePref = create<ThemeState>()(
  persist(
    (set) => ({
      pref: 'system',
      setPref: (pref) => set({ pref }),
    }),
    { name: 'meesae.theme', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
