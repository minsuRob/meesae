/**
 * 접속 중 판정. 마지막 활동(lastActiveAt) 뒤 이 시간 안이면 "접속 중"으로 본다.
 * 앱과 서버가 같은 기준을 쓴다. 공개 문서에는 시각만 있고, 좌표는 없다.
 */

export const ONLINE_WINDOW_MS = 10 * 60 * 1000;

export function isOnline(lastActiveAt: number | null | undefined, now: number): boolean {
  return typeof lastActiveAt === 'number' && lastActiveAt > 0 && now - lastActiveAt < ONLINE_WINDOW_MS;
}
