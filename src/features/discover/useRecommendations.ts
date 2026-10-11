/**
 * 추천 목록. 첫 페이지는 필터가 바뀔 때마다 effect 가 읽고, 다음 페이지는 스크롤 이벤트에서 읽는다.
 * 받은 결과에 필터 키를 붙여 두어 필터를 바꾼 직후 옛 목록을 보여 주지 않는다.
 */

import { useEffect, useState } from 'react';

import type { ProfileCard } from '@shared/api';
import type { DiscoverFilters } from '@shared/models';

import { call, toApiError, type ApiError } from '@/firebase/api';

interface Page {
  key: string;
  items: ProfileCard[];
  cursor: number | null;
  error: ApiError | null;
}

export function useRecommendations(filters: DiscoverFilters, enabled: boolean) {
  const [tick, setTick] = useState(0);
  const key = `${JSON.stringify(filters)}#${tick}`;
  const [page, setPage] = useState<Page | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    call('getRecommendations', { filters, cursor: null }).then(
      (res) => alive && setPage({ key, items: res.items, cursor: res.nextCursor, error: null }),
      (e) => alive && setPage({ key, items: [], cursor: null, error: toApiError(e) }),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  const fresh = page?.key === key ? page : null;

  async function loadMore() {
    if (!fresh || fresh.cursor === null || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await call('getRecommendations', { filters, cursor: fresh.cursor });
      setPage((p) => {
        if (!p || p.key !== key) return p;
        const seen = new Set(p.items.map((x) => x.uid));
        return { ...p, items: [...p.items, ...res.items.filter((x) => !seen.has(x.uid))], cursor: res.nextCursor };
      });
    } catch (e) {
      setPage((p) => (p && p.key === key ? { ...p, error: toApiError(e) } : p));
    } finally {
      setLoadingMore(false);
    }
  }

  const markLiked = (uid: string) =>
    setPage((p) => (p ? { ...p, items: p.items.map((x) => (x.uid === uid ? { ...x, likedByMe: true } : x)) } : p));

  return {
    items: fresh?.items ?? [],
    loading: (enabled && !fresh) || loadingMore,
    error: fresh?.error?.message ?? null,
    errorCode: fresh?.error?.code ?? null,
    hasMore: fresh?.cursor != null,
    refresh: () => setTick((t) => t + 1),
    loadMore: () => void loadMore(),
    markLiked,
  };
}
