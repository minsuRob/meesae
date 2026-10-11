/**
 * 모든 callable 의 입구. 로그인·App Check·정지·클레임·레이트리밋을 한 곳에서 검사한다.
 *
 *   export const likeUser = callable('likeUser', { action: 'like.send', rate: RATE.like }, async (req, ctx) => ...)
 */

import type { SecretParam } from 'firebase-functions/params';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';

import type { ApiName, ApiReq, ApiRes } from '../../../shared/api';
import { COL } from '../../../shared/models';
import { can, missingFor, pickClaims, type Action, type Claims } from '../../../shared/permissions';
import { db } from './admin';
import { appError, invalid } from './errors';
import { rateLimit, type RateRule } from './rateLimit';

/**
 * 기본은 강제. 콘솔에서 App Check 등록을 마치기 전에는 functions/.env 에서 false 로 둘 수 있다.
 * 에뮬레이터는 functions/.env.local 이 false 로 덮는다.
 */
const ENFORCE_APP_CHECK = process.env.ENFORCE_APP_CHECK !== 'false';

export interface Ctx {
  uid: string;
  claims: Claims;
  email: string | null;
  phoneNumber: string | null;
}

export interface GuardOptions {
  /** 이 행동의 권한이 필요하다. 없으면 로그인·정지 여부만 본다 */
  action?: Action;
  rate?: RateRule;
  /** 이 함수가 읽는 Secret Manager 값 */
  secrets?: SecretParam[];
}

// 정지는 클레임(토큰 최대 1시간 지연) + 내부 문서 두 군데서 본다. 문서는 인스턴스마다 60초 캐시.
const banCache = new Map<string, { banned: boolean; at: number }>();

async function isBannedNow(uid: string): Promise<boolean> {
  const hit = banCache.get(uid);
  if (hit && Date.now() - hit.at < 60_000) return hit.banned;
  const snap = await db.collection(COL.usersInternal).doc(uid).get();
  const banned = Boolean(snap.get('banReason'));
  banCache.set(uid, { banned, at: Date.now() });
  return banned;
}

export async function guard(req: CallableRequest<unknown>, opts: GuardOptions): Promise<Ctx> {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign-in required');
  const uid = req.auth.uid;
  const claims = pickClaims(req.auth.token as Record<string, unknown>);

  if (claims.banned || (await isBannedNow(uid))) throw appError('BANNED');

  if (opts.action && !can(claims, opts.action)) {
    const missing = missingFor(claims, opts.action);
    if (missing === 'phoneVerified') throw appError('PHONE_REQUIRED');
    if (missing === 'onboarded') throw appError('NOT_ONBOARDED');
    throw new HttpsError('permission-denied', 'Permission denied');
  }

  if (opts.rate) await rateLimit(uid, opts.rate);

  return {
    uid,
    claims,
    email: (req.auth.token.email as string | undefined) ?? null,
    phoneNumber: (req.auth.token.phone_number as string | undefined) ?? null,
  };
}

export function callable<N extends ApiName>(
  _name: N,
  opts: GuardOptions,
  handler: (data: ApiReq<N>, ctx: Ctx) => Promise<ApiRes<N>>,
) {
  return onCall(
    { enforceAppCheck: ENFORCE_APP_CHECK, cors: true, ...(opts.secrets ? { secrets: opts.secrets } : {}) },
    async (req) => {
      const ctx = await guard(req, opts);
      const data = (req.data && typeof req.data === 'object' ? req.data : {}) as ApiReq<N>;
      return handler(data, ctx);
    },
  );
}

/** 요청 값 검사용 단언. note 는 로그용 영어 메모 (사용자에게는 일반 오류 문구가 보인다) */
export function need(cond: unknown, note = 'invalid input'): asserts cond {
  if (!cond) throw invalid(undefined, note);
}

export function isUid(v: unknown): v is string {
  return typeof v === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(v);
}

export function isDocId(v: unknown): v is string {
  return typeof v === 'string' && /^[A-Za-z0-9_~-]{1,200}$/.test(v);
}
