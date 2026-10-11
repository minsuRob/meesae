/**
 * 디자인 토큰. 디자인을 바꿀 때는 이 파일과 ui/primitives 만 고친다.
 * 화면 코드에서 색·간격 숫자를 직접 쓰지 않는다.
 *
 * 색은 라이트/다크 두 벌이다. 컴포넌트 안에서 `const colors = useColors()` 로 받는다
 * (정적으로 import 하면 모드가 바뀌어도 색이 안 바뀐다).
 */

import { useColorScheme } from 'react-native';

import { useThemePref } from '@/store/theme';

const light = {
  bg: '#FFFFFF',
  bgMuted: '#F4F4F6',
  surface: '#FFFFFF',
  border: '#E7E7EA',
  text: '#16161A',
  textMuted: '#6B6B76',
  textInverse: '#FFFFFF',
  primary: '#F43F5E',
  primaryPressed: '#E11D48',
  primarySoft: '#FFE4E8',
  /** primarySoft 위에 올리는 글자색 */
  onPrimarySoft: '#BE123C',
  accent: '#7C3AED',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  dangerPressed: '#B91C1C',
  overlay: 'rgba(0,0,0,0.45)',
  point: '#F59E0B',
  pointSoft: '#FEF3C7',
  pointText: '#92400E',
  pointCardBorder: '#FDE68A',
  verified: '#2563EB',
};

export type Colors = typeof light;

const dark: Colors = {
  bg: '#0F0F12',
  bgMuted: '#1C1C21',
  surface: '#16161A',
  border: '#2A2A31',
  text: '#F2F2F5',
  textMuted: '#9A9AA6',
  textInverse: '#FFFFFF',
  primary: '#FB5A76',
  primaryPressed: '#F43F5E',
  primarySoft: '#3A1520',
  onPrimarySoft: '#FDA4B4',
  accent: '#A78BFA',
  success: '#4ADE80',
  warning: '#FBBF24',
  danger: '#F87171',
  dangerPressed: '#EF4444',
  overlay: 'rgba(0,0,0,0.65)',
  point: '#FBBF24',
  pointSoft: '#3A2E0B',
  pointText: '#FCD34D',
  pointCardBorder: '#5C4712',
  verified: '#60A5FA',
};

export const palettes = { light, dark } as const;
export type Scheme = keyof typeof palettes;

/** 지금 화면 모드. 설정이 'system' 이면 기기 설정을 따른다 */
export function useScheme(): Scheme {
  const system = useColorScheme();
  const pref = useThemePref((s) => s.pref);
  if (pref === 'light' || pref === 'dark') return pref;
  return system === 'dark' ? 'dark' : 'light';
}

export function useColors(): Colors {
  return palettes[useScheme()];
}

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
} as const;

export const font = {
  size: { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, xxl: 28 },
  weight: { regular: '400', medium: '600', bold: '700' },
} as const;

export const layout = {
  /** 이 폭 이상이면 데스크톱 레이아웃 (태블릿·폴드 펼침 포함) */
  desktopMinWidth: 768,
  sidebarWidth: 240,
  listPaneWidth: 360,
  contentMaxWidth: 720,
} as const;
