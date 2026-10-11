/**
 * Firestore 문서 형식. 시간은 전부 서버가 넣은 epoch 밀리초(number)다.
 * (Timestamp 를 쓰지 않는 이유: shared 가 firebase 를 import 하지 않고, JSON 으로 그대로 오간다.)
 *
 * 컬렉션별 읽기/쓰기 권한은 firestore.rules 와 docs/decisions.md 의 표를 본다.
 */

import type { ShopItemId } from './economy';
import type { Localized } from './i18n';
import type { DailyCounter } from './economy';
import type { Drinking, Gender, Mbti, Smoking } from './onboarding-schema';
import type { LatLng } from './region';

export const COL = {
  usersPublic: 'users_public',
  usersPrivate: 'users_private',
  usersInternal: 'users_internal',
  wallets: 'wallets',
  ledger: 'ledger',
  requests: 'requests',
  likes: 'likes',
  matches: 'matches',
  conversations: 'conversations',
  messages: 'messages',
  posts: 'posts',
  comments: 'comments',
  postLikes: 'likes',
  blocks: 'blocks',
  blockTargets: 'targets',
  reports: 'reports',
  locationShares: 'location_shares',
  regionStats: 'region_stats',
  phoneIndex: 'phone_index',
  rateLimits: 'rate_limits',
  config: 'config',
  geocodeCache: 'geocode_cache',
} as const;

export type Badge = 'phone' | 'location';

/** users_public/{uid} — 다른 사용자에게 보이는 것 */
export interface UserPublic {
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
  countryCode: string;
  /** 현지 언어 지역 이름 (기본값) */
  regionLabel: string | null;
  /** 지원 언어별 지역 이름. 없으면 regionLabel */
  regionLabels: Localized;
  regionKey: string | null;
  /** regionKey 의 앞 두 칸 (`KR~서울특별시`). '같은 시·도' 필터용 */
  admin1Key: string | null;
  badges: Badge[];
  /** 추천 정렬용 */
  lastActiveAt: number;
  boostUntil: number;
  /** 탈퇴·정지 시 false. 추천·지도에서 빠진다 */
  visible: boolean;
  createdAt: number;
  /** 추후: 연애성향·취미·관심사 */
  interests?: string[];
}

export interface DiscoverFilters {
  genders?: Gender[];
  ageMin?: number;
  ageMax?: number;
  /** 'country' = 같은 나라 전체, 'admin1' = 같은 시·도, 'district' = 같은 구 */
  scope?: 'country' | 'admin1' | 'district';
  /** 추가 필터 (상점 아이템 extraFilters 필요) */
  mbti?: Mbti[];
  drinking?: Drinking[];
  smoking?: Smoking[];
}

/** users_private/{uid} — 본인과 서버만 */
export interface UserPrivate {
  uid: string;
  email: string | null;
  birthDate: string;
  countryCode: string;
  phoneHash: string | null;
  location: (LatLng & { geohash: string; accuracy: number; verifiedAt: number }) | null;
  regionKey: string | null;
  regionLabel: string | null;
  regionLabels: Localized;
  filters: DiscoverFilters;
  fcmTokens: string[];
  createdAt: number;
}

/** users_internal/{uid} — 서버만 */
export interface UserInternal {
  uid: string;
  riskScore: number;
  reportCount: number;
  banReason: string | null;
  rewards: { profileComplete?: boolean; phoneVerified?: boolean };
  createdAt: number;
}

/** wallets/{uid} */
export interface Wallet {
  uid: string;
  balance: number;
  freeIntrosUsed: number;
  dailyLikes: DailyCounter;
  lastCheckInDate: string | null;
  lastLocationRewardDate: string | null;
  inventory: Partial<Record<ShopItemId, number>>;
  /** 기간형 아이템 만료 시각 */
  perks: Partial<Record<ShopItemId, number>>;
  updatedAt: number;
}

/** wallets/{uid}/ledger/{id} */
export interface LedgerEntry {
  delta: number;
  balanceAfter: number;
  reason: string;
  refId: string | null;
  createdAt: number;
}

export type ConversationKind = 'intro' | 'match';

/** conversations/{id}. id = 두 uid 를 정렬해 이은 값 */
export interface Conversation {
  id: string;
  members: [string, string];
  kind: ConversationKind;
  /** 대화를 연 사람 (intro) */
  openedBy: string;
  lastMessage: { text: string; senderUid: string; type: MessageType; systemKey?: SystemMessageKey; at: number } | null;
  unread: Record<string, number>;
  /** 각자 마지막으로 읽은 시각 (읽음 확인 아이템) */
  readAt: Record<string, number>;
  /** 한쪽이 차단·탈퇴하면 채워진다. 이후 전송 불가 */
  closedBy: string | null;
  /** 탈퇴한 멤버 → 탈퇴 시각. 앱은 이걸로 '탈퇴한 사용자' 를 표시한다 */
  left?: Record<string, number>;
  createdAt: number;
  updatedAt: number;
}

export type MessageType = 'text' | 'image' | 'system';

/** 시스템 메시지는 문장 대신 키를 저장하고 앱이 사용자 언어로 보여 준다 */
export type SystemMessageKey = 'matched';

export interface Message {
  id: string;
  senderUid: string;
  type: MessageType;
  text: string;
  imagePath: string | null;
  systemKey?: SystemMessageKey;
  createdAt: number;
}

export interface Match {
  id: string;
  members: [string, string];
  createdAt: number;
}

export type PostStatus = 'visible' | 'hidden';

export interface Post {
  id: string;
  authorUid: string;
  author: { nickname: string; photo: string | null; badges: Badge[]; regionLabel: string | null; regionLabels?: Localized };
  text: string;
  imagePaths: string[];
  countryCode: string;
  likeCount: number;
  commentCount: number;
  status: PostStatus;
  createdAt: number;
}

export interface Comment {
  id: string;
  authorUid: string;
  author: { nickname: string; photo: string | null };
  text: string;
  createdAt: number;
}

export interface LocationShare {
  id: string;
  conversationId: string;
  members: [string, string];
  startedBy: string;
  /** 참여자별 마지막 좌표. 공유 세션 안에서만 보인다 */
  positions: Record<string, LatLng & { at: number }>;
  expiresAt: number;
  createdAt: number;
}

export interface RegionStat {
  regionKey: string;
  label: string;
  labels: Localized;
  countryCode: string;
  /** geohash 5자리 격자 중심. 개인 위치가 아니다 */
  center: LatLng;
  count: number;
}

/** 두 uid 로 대화·매치 문서 ID 를 만든다. 순서와 무관하게 같은 값 */
export function pairId(a: string, b: string): string {
  return [a, b].sort().join('_');
}

export function otherMember(members: readonly string[], me: string): string {
  return members.find((m) => m !== me) ?? me;
}

/** 대화 상대가 탈퇴했는가 */
export function peerLeft(c: Pick<Conversation, 'members' | 'left'>, me: string): boolean {
  return Boolean(c.left?.[otherMember(c.members, me)]);
}
