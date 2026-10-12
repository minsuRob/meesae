/**
 * 좋아요·대화 시작. 포인트가 모자라면 포인트 허브로 안내한다.
 * 같은 버튼을 다시 눌러 재시도할 때도 새 요청 ID 를 쓴다 (네트워크 재시도는 SDK 가 같은 요청으로 한다).
 */

import { router } from 'expo-router';

import { ApiError, call, newRequestId, toApiError } from '@/firebase/api';
import { translate } from '@/i18n';
import { haptic } from '@/ui/haptics';
import { confirm, notify } from '@/ui/notify';

async function handle(e: unknown): Promise<null> {
  const err = toApiError(e);
  if (err instanceof ApiError && err.code === 'INSUFFICIENT_POINTS') {
    const go = await confirm(
      translate('discover.lowPointsTitle'),
      translate('discover.lowPointsBody'),
      translate('discover.lowPointsAction'),
    );
    if (go) router.push({ pathname: '/feed', params: { tab: 'points' } });
    return null;
  }
  notify(err.message);
  return null;
}

export async function likeUser(targetUid: string, superLike = false) {
  try {
    const res = await call('likeUser', { targetUid, superLike, clientRequestId: newRequestId() });
    if (res.matched && res.conversationId) {
      haptic('success');
      const go = await confirm(
        translate('discover.matchedTitle'),
        translate('discover.matchedBody'),
        translate('discover.matchedAction'),
      );
      if (go) router.push({ pathname: '/chat/[id]', params: { id: res.conversationId } });
    }
    return res;
  } catch (e) {
    return handle(e);
  }
}

export async function startConversation(targetUid: string) {
  try {
    const res = await call('startConversation', { targetUid, clientRequestId: newRequestId() });
    router.push({ pathname: '/chat/[id]', params: { id: res.conversationId } });
    return res;
  } catch (e) {
    return handle(e);
  }
}
