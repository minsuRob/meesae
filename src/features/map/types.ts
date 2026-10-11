export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  /** 원 크기를 정하는 값 (지역별 사용자 수) */
  weight?: number;
  highlight?: boolean;
}

export interface MapViewProps {
  center: { lat: number; lng: number };
  zoom: number;
  markers: MapMarker[];
  onMarkerPress?: (id: string) => void;
}

/** OpenFreeMap: 키 불필요, 전 세계 벡터 타일. 다크 모드는 dark 스타일 */
export const MAP_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const;

/** 사람 수 → 원 지름(px) */
export function markerSize(weight = 1): number {
  return Math.round(28 + Math.min(40, Math.sqrt(weight) * 6));
}
