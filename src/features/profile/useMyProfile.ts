import type { UserPublic } from '@shared/models';

import { refs } from '@/firebase/collections';
import { useDoc } from '@/firebase/hooks';
import { useUid } from '@/store/session';

/** 내 공개 프로필 실시간 */
export function useMyProfile(): UserPublic | null {
  const uid = useUid();
  return useDoc(uid ? refs.userPublic(uid) : null).data;
}
