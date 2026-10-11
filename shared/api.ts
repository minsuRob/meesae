/**
 * Callable Functions 의 요청·응답 계약. 앱 `src/firebase/api.ts` 와 Functions 가 같은 타입을 쓴다.
 * 이름을 바꾸면 functions/src/index.ts 의 export 이름도 같이 바꾼다.
 */

import type { ShopItemId } from './economy';
import type { Localized } from './i18n';
import type { DiscoverFilters, Badge, ConversationKind, RegionStat } from './models';
import type { OnboardingDraft, Gender, Mbti, Drinking, Smoking } from './onboarding-schema';
import type { DistanceBucket, LatLng } from './region';

/** 포인트가 움직이는 요청은 전부 멱등키를 받는다 */
export interface Idempotent {
  clientRequestId: string;
}

export interface WalletDelta {
  balance: number;
  charged: number;
  free: boolean;
}

export interface ProfileCard {
  uid: string;
  nickname: string;
  age: number;
  gender: Gender;
  photos: string[];
  mbti: Mbti | null;
  drinking: Drinking | null;
  smoking: Smoking | null;
  job: string;
  school: string;
  regionLabel: string | null;
  regionLabels: Localized;
  badges: Badge[];
  distance: DistanceBucket;
  likedByMe: boolean;
}

export interface Api {
  completeOnboarding: { req: { draft: OnboardingDraft }; res: { ok: true; rewarded: number } };
  updateProfile: {
    req: Partial<Pick<OnboardingDraft, 'nickname' | 'photos' | 'mbti' | 'drinking' | 'smoking' | 'job' | 'school'>>;
    res: { ok: true };
  };
  setCountry: { req: { countryCode: string }; res: { ok: true } };
  updateLocation: {
    req: LatLng & { accuracy: number };
    res: { regionLabel: string; regionLabels: Localized; regionKey: string; rewarded: number; balance: number };
  };
  getRecommendations: {
    req: { filters?: DiscoverFilters; cursor?: number | null };
    res: { items: ProfileCard[]; nextCursor: number | null };
  };
  getProfile: { req: { uid: string }; res: { profile: ProfileCard } };
  getRegionStats: { req: { countryCode?: string }; res: { regions: RegionStat[]; mine: string | null } };
  likeUser: {
    req: Idempotent & { targetUid: string; superLike?: boolean };
    res: WalletDelta & { matched: boolean; conversationId: string | null };
  };
  startConversation: {
    req: Idempotent & { targetUid: string };
    res: WalletDelta & { conversationId: string; kind: ConversationKind; existed: boolean };
  };
  sendMessage: { req: { conversationId: string; text: string; clientRequestId: string }; res: { messageId: string } };
  finalizeChatImage: {
    req: { conversationId: string; path: string; clientRequestId: string };
    res: { messageId: string };
  };
  markConversationRead: { req: { conversationId: string }; res: { ok: true } };
  createPost: { req: Idempotent & { text: string; imagePaths?: string[] }; res: { postId: string } };
  likePost: { req: { postId: string }; res: { liked: boolean; likeCount: number } };
  commentPost: { req: Idempotent & { postId: string; text: string }; res: { commentId: string } };
  deletePost: { req: { postId: string }; res: { ok: true } };
  dailyCheckIn: { req: Record<string, never>; res: { rewarded: number; balance: number } };
  purchaseItem: { req: Idempotent & { itemId: ShopItemId }; res: { balance: number; until: number | null } };
  claimPhoneVerified: { req: Record<string, never>; res: { rewarded: number } };
  startLocationShare: {
    req: { conversationId: string; minutes: number } & LatLng;
    res: { shareId: string; expiresAt: number };
  };
  updateSharedLocation: { req: { shareId: string } & LatLng; res: { ok: true } };
  stopLocationShare: { req: { shareId: string }; res: { ok: true } };
  blockUser: { req: { targetUid: string }; res: { ok: true } };
  unblockUser: { req: { targetUid: string }; res: { ok: true } };
  reportUser: {
    req: { targetUid: string; reason: ReportReason; detail?: string; refPath?: string };
    res: { ok: true };
  };
  deleteAccount: { req: { confirm: 'DELETE' }; res: { ok: true } };
}

export type ApiName = keyof Api;
export type ApiReq<N extends ApiName> = Api[N]['req'];
export type ApiRes<N extends ApiName> = Api[N]['res'];

export const REPORT_REASONS = ['spam', 'abuse', 'fake', 'sexual', 'minor', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/**
 * 서버가 던지는 오류 코드. HttpsError 의 details.code 로 실린다.
 * 값은 로그용 영어 요약이고, 사용자 문구는 앱 카탈로그 errors.<CODE> 가 정한다.
 * INVALID 는 details.issue (shared/validators 의 Issue) 를 같이 싣는다.
 */
export const APP_ERRORS = {
  INSUFFICIENT_POINTS: 'Not enough points',
  NO_SUPER_LIKE: 'No super likes left',
  PHONE_REQUIRED: 'Phone verification required',
  NOT_ONBOARDED: 'Finish onboarding first',
  BANNED: 'Account restricted',
  BLOCKED: 'Blocked',
  RATE_LIMITED: 'Too many requests',
  ALREADY_LIKED: 'Already liked',
  NOT_FOUND: 'Not found',
  INVALID: 'Invalid input',
  PHOTO_MISSING: 'Uploaded photo not found',
  LOCATION_UNKNOWN: 'Could not resolve location',
  PHONE_IN_USE: 'Phone number already in use',
  NO_PHONE: 'No phone number linked',
  CONVERSATION_CLOSED: 'Conversation closed',
  SHARE_ENDED: 'Location share ended',
  PERK_REQUIRED: 'Extra filters item required',
} as const;

export type AppErrorCode = keyof typeof APP_ERRORS;
