/**
 * 탐색 필터. 바꾸면 users_private.filters 에도 저장해 다른 기기에서도 이어진다
 * (Rules 가 본인 문서의 filters 필드 쓰기만 허용한다).
 */

import { updateDoc } from 'firebase/firestore';
import { create } from 'zustand';

import type { DiscoverFilters } from '@shared/models';
import { sanitizeFilters } from '@shared/score';

import { refs } from '@/firebase/collections';

interface FiltersState {
  filters: DiscoverFilters;
  hydrated: boolean;
  hydrate: (f: DiscoverFilters | undefined) => void;
  save: (uid: string, f: DiscoverFilters) => Promise<void>;
}

export const DEFAULT_FILTERS: DiscoverFilters = { scope: 'country', ageMin: 20, ageMax: 40 };

export const useFilters = create<FiltersState>((set, get) => ({
  filters: DEFAULT_FILTERS,
  hydrated: false,
  hydrate: (f) => {
    if (get().hydrated) return;
    set({ filters: { ...DEFAULT_FILTERS, ...sanitizeFilters(f) }, hydrated: true });
  },
  save: async (uid, f) => {
    const clean = sanitizeFilters(f);
    set({ filters: clean });
    await updateDoc(refs.userPrivate(uid), { filters: clean });
  },
}));
