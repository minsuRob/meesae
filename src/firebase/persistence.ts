/**
 * 웹용 인증 저장소. 브라우저는 firebase 가 IndexedDB 를 알아서 쓴다.
 * 네이티브는 persistence.native.ts 가 대신 쓰인다.
 */

import type { Persistence } from 'firebase/auth';

export function nativePersistence(): Persistence | null {
  return null;
}
