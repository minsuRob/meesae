/**
 * 포인트 경제. 숫자는 전부 여기 한 곳에만 둔다.
 *
 * 앱은 안내 문구에, Functions 는 실제 차감·지급에 같은 함수를 쓴다.
 * 운영 중 바꾸고 싶은 값은 Firestore `config/economy` 가 이 기본값 위에 덮어쓴다
 * (`mergeEconomy`). 클라이언트가 보낸 금액은 절대 믿지 않는다.
 */

export const ECONOMY = {
  /** 낯선 상대에게 먼저 거는 대화(intro). 계정 평생 누적 무료 횟수 */
  INTRO_FREE_LIMIT: 10,
  INTRO_COST: 30,

  /** 좋아요. 하루 무료 횟수 */
  LIKE_FREE_PER_DAY: 3,
  LIKE_COST: 10,

  /** 위치 인증 보상 (하루 1회) */
  LOCATION_REWARD: 5,
  /** 위치 인증으로 인정하는 최대 GPS 오차(m) */
  LOCATION_MAX_ACCURACY_M: 200,
  /** 직전 위치에서 이 속도(km/h)보다 빨리 움직였으면 보상하지 않는다 */
  LOCATION_MAX_SPEED_KMH: 300,

  /** 출석 (하루 1회) */
  CHECKIN_REWARD: 10,

  /** 1회성 보상 */
  PROFILE_COMPLETE_REWARD: 50,
  PHONE_VERIFIED_REWARD: 100,

  /** 하루의 경계. 분 단위 UTC 오프셋 (한국 = +540). 국가별 리셋은 docs/decisions.md 미정 항목 */
  DAY_RESET_UTC_OFFSET_MIN: 540,
} as const;

export type Economy = { -readonly [K in keyof typeof ECONOMY]: number };

export type ShopItemId = 'boost' | 'superLike' | 'readReceipt' | 'extraFilters';

/** 이름·설명은 앱 번역 카탈로그 shop.<id> 에 있다 */
export interface ShopItem {
  id: ShopItemId;
  cost: number;
  /** 기간형 아이템이면 지속 시간(분). 소모형이면 undefined */
  durationMin?: number;
}

export const SHOP_ITEMS: Record<ShopItemId, ShopItem> = {
  boost: {
    id: 'boost',
    cost: 100,
    durationMin: 30,
  },
  superLike: {
    id: 'superLike',
    cost: 30,
  },
  readReceipt: {
    id: 'readReceipt',
    cost: 200,
    durationMin: 7 * 24 * 60,
  },
  extraFilters: {
    id: 'extraFilters',
    cost: 150,
    durationMin: 7 * 24 * 60,
  },
};

export type LedgerReason =
  | 'intro'
  | 'like'
  | 'locationReward'
  | 'checkIn'
  | 'profileComplete'
  | 'phoneVerified'
  | `purchase:${ShopItemId}`
  | 'adminGrant';

/** 운영 문서(config/economy)를 기본값 위에 덮는다. 숫자가 아니거나 음수인 값은 버린다. */
export function mergeEconomy(override: unknown): Economy {
  const out: Economy = { ...ECONOMY };
  if (!override || typeof override !== 'object') return out;
  for (const key of Object.keys(ECONOMY) as (keyof Economy)[]) {
    const v = (override as Record<string, unknown>)[key];
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) out[key] = v;
  }
  return out;
}

/** 'YYYY-MM-DD'. 하루 단위 무료 횟수·보상의 키 */
export function dayKey(ms: number, offsetMin: number = ECONOMY.DAY_RESET_UTC_OFFSET_MIN): string {
  return new Date(ms + offsetMin * 60_000).toISOString().slice(0, 10);
}

export interface Charge {
  /** 무료 횟수로 처리되는가 */
  free: boolean;
  /** 차감할 포인트 (무료면 0) */
  cost: number;
}

/** intro 대화 비용. freeIntrosUsed 는 지금까지 쓴 무료 횟수 */
export function introCharge(freeIntrosUsed: number, eco: Economy = ECONOMY): Charge {
  return freeIntrosUsed < eco.INTRO_FREE_LIMIT
    ? { free: true, cost: 0 }
    : { free: false, cost: eco.INTRO_COST };
}

export interface DailyCounter {
  date: string;
  count: number;
}

/** 오늘 이미 쓴 횟수. 날짜가 바뀌었으면 0 */
export function usedToday(counter: DailyCounter | undefined, today: string): number {
  return counter && counter.date === today ? counter.count : 0;
}

/** 좋아요 비용 */
export function likeCharge(
  counter: DailyCounter | undefined,
  today: string,
  eco: Economy = ECONOMY,
): Charge {
  return usedToday(counter, today) < eco.LIKE_FREE_PER_DAY
    ? { free: true, cost: 0 }
    : { free: false, cost: eco.LIKE_COST };
}

/** 하루 1회 보상을 받을 수 있는가 */
export function canClaimDaily(lastDate: string | undefined, today: string): boolean {
  return lastDate !== today;
}

/** 남은 무료 횟수 안내용 */
export function remainingFreeIntros(freeIntrosUsed: number, eco: Economy = ECONOMY): number {
  return Math.max(0, eco.INTRO_FREE_LIMIT - freeIntrosUsed);
}

export function remainingFreeLikes(
  counter: DailyCounter | undefined,
  today: string,
  eco: Economy = ECONOMY,
): number {
  return Math.max(0, eco.LIKE_FREE_PER_DAY - usedToday(counter, today));
}
