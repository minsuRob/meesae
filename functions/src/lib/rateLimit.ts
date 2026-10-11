/**
 * 고정 창 레이트리밋. `rate_limits/{uid}~{key}` 문서 하나에 창 시작 시각과 횟수를 둔다.
 * 클라이언트는 이 컬렉션을 못 읽고 못 쓴다 (Rules 기본 deny).
 */

import { COL } from '../../../shared/models';
import { db, now } from './admin';
import { appError } from './errors';

export interface RateRule {
  key: string;
  max: number;
  windowSec: number;
}

export const RATE = {
  message: { key: 'message', max: 30, windowSec: 60 },
  post: { key: 'post', max: 5, windowSec: 600 },
  comment: { key: 'comment', max: 20, windowSec: 300 },
  like: { key: 'like', max: 60, windowSec: 60 },
  intro: { key: 'intro', max: 20, windowSec: 3600 },
  location: { key: 'location', max: 30, windowSec: 600 },
  report: { key: 'report', max: 10, windowSec: 3600 },
  recommend: { key: 'recommend', max: 60, windowSec: 60 },
  shareUpdate: { key: 'shareUpdate', max: 30, windowSec: 60 },
} satisfies Record<string, RateRule>;

export async function rateLimit(uid: string, rule: RateRule): Promise<void> {
  const ref = db.collection(COL.rateLimits).doc(`${uid}~${rule.key}`);
  const t = now();
  const allowed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.data() as { windowStart: number; count: number } | undefined;
    if (!d || t - d.windowStart >= rule.windowSec * 1000) {
      tx.set(ref, { windowStart: t, count: 1, expiresAt: t + rule.windowSec * 1000 });
      return true;
    }
    if (d.count >= rule.max) return false;
    tx.update(ref, { count: d.count + 1 });
    return true;
  });
  if (!allowed) throw appError('RATE_LIMITED');
}
