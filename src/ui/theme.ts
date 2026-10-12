/**
 * 테마 훅. 값은 전부 tokens.ts 에 있고, 여기서는 지금 화면 모드에 맞는 쪽을 골라 준다.
 *
 * 색은 컴포넌트 안에서 `const colors = useColors()` 로 받는다
 * (정적으로 import 하면 모드가 바뀌어도 색이 안 바뀐다).
 * `SchemeOverride` 는 라이트·다크를 한 화면에 같이 그릴 때(개발용 갤러리)와 사진 스크림 위에서만 쓴다.
 */

import { createContext, useContext } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { useThemePref } from '@/store/theme';

import { elevation, palettes, type Colors, type Elevation, type Scheme } from './tokens';

export * from './tokens';

export const SchemeOverride = createContext<Scheme | null>(null);

/** 지금 화면 모드. 설정이 'system' 이면 기기 설정을 따른다 */
export function useScheme(): Scheme {
  const forced = useContext(SchemeOverride);
  const system = useColorScheme();
  const pref = useThemePref((s) => s.pref);
  if (forced) return forced;
  if (pref === 'light' || pref === 'dark') return pref;
  return system === 'dark' ? 'dark' : 'light';
}

export function useColors(): Colors {
  return palettes[useScheme()];
}

/** boxShadow 문자열. `style={{ boxShadow: useElevation()[1] }}` */
export function useElevation(): Record<Elevation, string> {
  return elevation[useScheme()];
}

/**
 * 글꼴. 네이티브는 app.json 의 expo-font 플러그인이 Pretendard static OTF 를 넣고,
 * 웹은 fonts.web.ts 가 CSS 를 붙인다 (없으면 시스템 글꼴).
 */
export const fontFamily = Platform.select({
  web: '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Roboto, sans-serif',
  default: 'Pretendard',
}) as string;
