import { useEffect, useState } from 'react';

/** 현재 시각. 렌더 중에 Date.now() 를 부르지 않기 위해 상태로 들고 일정 간격으로 갱신한다. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
