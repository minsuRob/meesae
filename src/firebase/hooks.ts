/**
 * Firestore 실시간 구독 훅. 참조가 null 이면 구독하지 않는다.
 * 참조 객체는 매 렌더마다 새로 만들어지므로 key 문자열로 의존성을 잡고,
 * 받은 값에도 key 를 붙여 두어 참조가 바뀐 직후의 옛 값을 보여 주지 않는다.
 */

import { onSnapshot, type DocumentReference, type Query } from 'firebase/firestore';
import { useEffect, useState } from 'react';

export interface Live<T> {
  data: T;
  loading: boolean;
  error: Error | null;
}

interface Snap<T> {
  key: string | null;
  data: T;
  error: Error | null;
}

export function useDoc<T>(ref: DocumentReference<T> | null): Live<T | null> {
  const key = ref?.path ?? null;
  const [snap, setSnap] = useState<Snap<T | null>>({ key: null, data: null, error: null });
  useEffect(() => {
    if (!ref) return;
    return onSnapshot(
      ref,
      (s) => setSnap({ key, data: s.exists() ? s.data() : null, error: null }),
      (error) => setSnap({ key, data: null, error }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!key) return { data: null, loading: false, error: null };
  if (snap.key !== key) return { data: null, loading: true, error: null };
  return { data: snap.data, loading: false, error: snap.error };
}

export function useQuery<T>(q: Query<T> | null, key: string | null): Live<T[]> {
  const [snap, setSnap] = useState<Snap<T[]>>({ key: null, data: [], error: null });
  useEffect(() => {
    if (!q || !key) return;
    return onSnapshot(
      q,
      (s) => setSnap({ key, data: s.docs.map((d) => d.data()), error: null }),
      (error) => setSnap({ key, data: [], error }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!q || !key) return { data: [], loading: false, error: null };
  if (snap.key !== key) return { data: [], loading: true, error: null };
  return { data: snap.data, loading: false, error: snap.error };
}

/** 비동기 한 번 읽기 (Functions 호출 등). reload() 로 다시 부른다. */
export function useAsync<T>(fn: () => Promise<T>, key: string | null) {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<{ key: string | null; data: T | null; error: Error | null }>({
    key: null,
    data: null,
    error: null,
  });
  const fullKey = key === null ? null : `${key}#${tick}`;
  useEffect(() => {
    if (fullKey === null) return;
    let alive = true;
    fn().then(
      (data) => alive && setState({ key: fullKey, data, error: null }),
      (error: Error) => alive && setState({ key: fullKey, data: null, error }),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullKey]);
  const fresh = state.key === fullKey;
  return {
    data: fresh ? state.data : null,
    error: fresh ? state.error : null,
    loading: fullKey !== null && !fresh,
    reload: () => setTick((t) => t + 1),
  };
}
