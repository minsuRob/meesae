/**
 * 화면 모드에 맞는 지도 스타일. 라이트는 OpenFreeMap liberty 주소 그대로,
 * 다크는 OpenFreeMap dark 를 한 번 받아 meesae 색으로 조정한 스타일 객체 (앱 수명 동안 캐시).
 * 받기에 실패하면 원래 dark 주소로 대체한다.
 */

import { useEffect, useState } from 'react';

import type { Scheme } from '@/ui/theme';

import { tuneDarkStyle, type StyleDoc } from './meesaeDark';
import { MAP_STYLES } from './types';

export type MapStyle = string | StyleDoc;

let darkStyle: Promise<MapStyle> | null = null;

export function loadDarkStyle(): Promise<MapStyle> {
  darkStyle ??= fetch(MAP_STYLES.dark)
    .then((r) => (r.ok ? (r.json() as Promise<StyleDoc>) : Promise.reject(new Error(String(r.status)))))
    .then((base) => tuneDarkStyle(base) as MapStyle)
    .catch(() => {
      darkStyle = null; // 다음에 다시 시도
      return MAP_STYLES.dark;
    });
  return darkStyle;
}

/** 아직 준비 안 됐으면 null (다크 스타일을 받는 중) */
export function useMapStyle(scheme: Scheme): MapStyle | null {
  const [dark, setDark] = useState<MapStyle | null>(null);
  useEffect(() => {
    if (scheme !== 'dark') return;
    let alive = true;
    loadDarkStyle().then((s) => alive && setDark(s));
    return () => {
      alive = false;
    };
  }, [scheme]);
  return scheme === 'dark' ? dark : MAP_STYLES.light;
}
