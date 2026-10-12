/**
 * 디자인 토큰 (순수 TS). react-native 를 import 하지 않아서 vitest(node) 와 Functions 어디서든 읽을 수 있다.
 * 화면 코드는 이 값을 직접 쓰지 않고 theme.ts 의 훅(useColors 등)으로 받는다.
 *
 * 디자인 언어: Airbnb (awesome-design-md/design-md/airbnb). 흰 캔버스 + 잉크 #222, 액센트는 Rausch 한 색만
 * (주요 CTA·좋아요), 모서리는 카드 14 / 버튼·입력 8 / 알약, 그림자는 한 단계뿐. 다크는 같은 키에 어두운 값.
 * 시안: docs/ui-prototypes/light-directions.html (2번 안)
 */

const light = {
  /** 0단계 캔버스 */
  bg: '#FFFFFF',
  /** 2단계 안쪽 면 (세그먼트 트랙, 상대 말풍선, 비활성 입력) */
  bgMuted: '#F7F7F7',
  /** 1단계 카드·헤더·탭바 */
  surface: '#FFFFFF',
  /** 3단계 (원형 아이콘 버튼 바탕, 시트) */
  surface3: '#F2F2F2',
  /** 입력창·카드 테두리 */
  border: '#DDDDDD',
  /** 목록 구분선처럼 더 연한 선 */
  hairline: '#EBEBEB',
  /** 포커스 뒤 입력창, 비활성 아웃라인 */
  borderStrong: '#C1C1C1',
  text: '#222222',
  textStrong: '#222222',
  /** 긴 본문 */
  textBody: '#3F3F3F',
  textMuted: '#6A6A6A',
  textFaint: '#929292',
  textInverse: '#FFFFFF',
  /** Rausch. 주요 CTA·좋아요·활성 탭에만 */
  primary: '#FF385C',
  primaryPressed: '#E00B41',
  primaryDisabled: '#FFD1DA',
  primarySoft: '#FFF0F3',
  onPrimary: '#FFFFFF',
  /** primarySoft 위 글자 */
  onPrimarySoft: '#C13515',
  /** 두 번째 강조색은 쓰지 않는다. 거리 배지·지도 마커는 잉크 */
  accent: '#222222',
  success: '#1A7F37',
  warning: '#B35A00',
  danger: '#C13515',
  dangerPressed: '#B32505',
  overlay: 'rgba(0,0,0,0.5)',
  /** 사진 스크림 위 글자 (항상 흰색) */
  scrimText: '#FFFFFF',
  /** 포인트는 잉크로 (노란색 금지, 별점도 잉크인 것처럼) */
  point: '#222222',
  pointSoft: '#F7F7F7',
  pointText: '#222222',
  pointCardBorder: '#DDDDDD',
  verified: '#222222',
  online: '#1A7F37',
  bubbleMine: '#222222',
  onBubbleMine: '#FFFFFF',
  bubbleTheirs: '#F7F7F7',
  /** boxShadow 색 */
  shadow: 'rgba(0,0,0,0.10)',
};

export type Colors = typeof light;

const dark: Colors = {
  // 같은 언어의 다크 판: 오프블랙 캔버스, 표면은 밝기로 한 단계씩, 액센트는 Rausch 를 조금 밝혀서
  bg: '#121212',
  bgMuted: '#262628',
  surface: '#1C1C1E',
  surface3: '#2C2C2E',
  border: '#3A3A3C',
  hairline: '#2A2A2C',
  borderStrong: '#48484A',
  text: '#F2F2F2',
  textStrong: '#FFFFFF',
  textBody: '#D1D1D1',
  textMuted: '#A1A1A6',
  textFaint: '#7C7C82',
  textInverse: '#FFFFFF',
  primary: '#FF5A75',
  primaryPressed: '#E11D48',
  primaryDisabled: '#4A1F2A',
  primarySoft: '#3A1B23',
  onPrimary: '#FFFFFF',
  onPrimarySoft: '#FFA3B4',
  accent: '#F2F2F2',
  success: '#4ADE80',
  warning: '#FBBF24',
  danger: '#DC2626',
  dangerPressed: '#B91C1C',
  overlay: 'rgba(0,0,0,0.65)',
  scrimText: '#FFFFFF',
  point: '#F2F2F2',
  pointSoft: '#262628',
  pointText: '#F2F2F2',
  pointCardBorder: '#3A3A3C',
  verified: '#F2F2F2',
  online: '#4ADE80',
  /** 라이트의 잉크 말풍선을 뒤집어 밝은 말풍선 + 어두운 글자 */
  bubbleMine: '#F2F2F2',
  onBubbleMine: '#121212',
  bubbleTheirs: '#262628',
  shadow: 'rgba(0,0,0,0)',
};

export const palettes = { light, dark } as const;
export type Scheme = keyof typeof palettes;

/** 사진 위 스크림: 위는 투명, 아래로 갈수록 어둡게 (LinearGradient colors 튜플) */
export const scrim = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.72)'] as const;
export const scrimLocations = [0, 0.45, 1] as const;

/** 그림자는 한 단계. 라이트는 Airbnb 의 유일한 그림자, 다크는 표면 밝기로 대신한다 (boxShadow 문자열) */
export const elevation = {
  light: {
    0: 'none',
    1: '0 0 0 1px rgba(0,0,0,0.02), 0 2px 6px 0 rgba(0,0,0,0.04), 0 4px 8px 0 rgba(0,0,0,0.10)',
    2: '0 8px 28px 0 rgba(0,0,0,0.16)',
  },
  dark: { 0: 'none', 1: 'none', 2: 'none' },
} as const;
export type Elevation = keyof (typeof elevation)['light'];

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  xs: 4,
  /** 버튼·입력·작은 사진 */
  sm: 8,
  md: 8,
  /** 카드·사진 */
  lg: 14,
  /** 하단 시트 윗모서리 */
  xl: 16,
  pill: 9999,
} as const;

/** 크기 / 행간 / 굵기 / 자간 (Airbnb 타입 램프를 모바일에 맞춤) */
export const type = {
  display: { fontSize: 28, lineHeight: 36, fontWeight: '700', letterSpacing: -0.3 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: -0.44 },
  heading: { fontSize: 20, lineHeight: 24, fontWeight: '600', letterSpacing: -0.18 },
  subtitle: { fontSize: 16, lineHeight: 20, fontWeight: '600', letterSpacing: 0 },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400', letterSpacing: 0 },
  bodySm: { fontSize: 14, lineHeight: 20, fontWeight: '400', letterSpacing: 0 },
  label: { fontSize: 14, lineHeight: 18, fontWeight: '500', letterSpacing: 0 },
  caption: { fontSize: 13, lineHeight: 16, fontWeight: '400', letterSpacing: 0 },
  micro: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0 },
  badge: { fontSize: 11, lineHeight: 13, fontWeight: '600', letterSpacing: 0 },
  button: { fontSize: 16, lineHeight: 20, fontWeight: '500', letterSpacing: 0 },
  buttonSm: { fontSize: 14, lineHeight: 18, fontWeight: '500', letterSpacing: 0 },
} as const;
export type TypeVariant = keyof typeof type;

/** 예전 호출부 호환 */
export const font = {
  size: { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, xxl: 28 },
  weight: { regular: '400', medium: '500', semibold: '600', bold: '700' },
} as const;

export const motion = {
  duration: { fast: 120, base: 200, slow: 320 },
  /** 눌림 */
  pressScale: 0.98,
} as const;

export const touch = { min: 44 } as const;

export const iconSize = { xs: 14, sm: 16, md: 20, lg: 24, xl: 28 } as const;
export type IconSize = keyof typeof iconSize;

export const avatarSize = { xs: 28, sm: 34, md: 40, lg: 48, xl: 72 } as const;
export type AvatarSize = keyof typeof avatarSize;

export const control = {
  /** 버튼·입력 높이 */
  button: 48,
  buttonSm: 40,
  input: 52,
  chip: 40,
  iconButton: 40,
  tabBar: 56,
  header: 56,
} as const;

export const layout = {
  /** 이 폭 이상이면 데스크톱 레이아웃 (태블릿·폴드 펼침 포함) */
  desktopMinWidth: 768,
  sidebarWidth: 240,
  listPaneWidth: 360,
  contentMaxWidth: 720,
  /** 채팅 사진 말풍선 폭 */
  bubbleImageWidth: 200,
  chatInputMaxHeight: 120,
  mapMinHeight: 300,
  /** 3열 사진 타일 (사이 간격 포함해서 세 개가 한 줄) */
  photoTileWidth: '31%' as const,
  /** 프로필 사진 비율 */
  photoAspect: 4 / 5,
} as const;
