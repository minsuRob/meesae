/**
 * 클레임 → 권한 매트릭스.
 *
 * 앱은 UI 를 숨기는 데, Functions 는 실제로 막는 데 같은 `can()` 을 쓴다.
 * Firestore/Storage Rules 는 이 파일을 import 할 수 없으니 같은 조건을 손으로 옮겨 적는다.
 * 여기를 바꾸면 firestore.rules · storage.rules 도 같이 본다.
 */

export type Role = 'user' | 'admin';

/** ID 토큰에 실리는 커스텀 클레임 */
export interface Claims {
  onboarded?: boolean;
  phoneVerified?: boolean;
  banned?: boolean;
  role?: Role;
}

export type Action =
  | 'profile.edit'
  | 'discover.view'
  | 'like.send'
  | 'chat.start'
  | 'chat.sendText'
  | 'chat.sendImage'
  | 'post.create'
  | 'post.interact'
  | 'map.view'
  | 'location.liveShare'
  | 'badge.verified'
  | 'admin';

type Requirement = 'onboarded' | 'phoneVerified' | 'admin';

const MATRIX: Record<Action, readonly Requirement[]> = {
  'profile.edit': ['onboarded'],
  'discover.view': ['onboarded'],
  'like.send': ['onboarded'],
  'chat.start': ['onboarded'],
  'chat.sendText': ['onboarded'],
  'chat.sendImage': ['onboarded', 'phoneVerified'],
  'post.create': ['onboarded'],
  'post.interact': ['onboarded'],
  'map.view': ['onboarded'],
  'location.liveShare': ['onboarded', 'phoneVerified'],
  'badge.verified': ['onboarded', 'phoneVerified'],
  admin: ['admin'],
};

function meets(claims: Claims, req: Requirement): boolean {
  switch (req) {
    case 'onboarded':
      return claims.onboarded === true;
    case 'phoneVerified':
      return claims.phoneVerified === true;
    case 'admin':
      return claims.role === 'admin';
  }
}

/** 이 클레임으로 행동을 할 수 있는가. 정지 계정은 무엇도 못 한다. */
export function can(claims: Claims | null | undefined, action: Action): boolean {
  if (!claims || claims.banned) return false;
  return MATRIX[action].every((r) => meets(claims, r));
}

/** 막혀 있다면 무엇이 모자란지. UI 에서 "휴대폰 인증이 필요해요" 같은 안내를 고른다. */
export function missingFor(
  claims: Claims | null | undefined,
  action: Action,
): Requirement | 'banned' | 'signedOut' | null {
  if (!claims) return 'signedOut';
  if (claims.banned) return 'banned';
  return MATRIX[action].find((r) => !meets(claims, r)) ?? null;
}

/** 토큰 클레임 객체에서 우리가 쓰는 값만 골라낸다 */
export function pickClaims(raw: Record<string, unknown> | undefined | null): Claims {
  if (!raw) return {};
  const out: Claims = {};
  if (raw.onboarded === true) out.onboarded = true;
  if (raw.phoneVerified === true) out.phoneVerified = true;
  if (raw.banned === true) out.banned = true;
  if (raw.role === 'admin' || raw.role === 'user') out.role = raw.role;
  return out;
}
