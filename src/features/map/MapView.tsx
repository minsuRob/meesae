/**
 * 웹 지도: maplibre-gl. DOM 에 직접 그리므로 View 의 ref 로 컨테이너를 잡는다.
 * 스타일은 useMapStyle (라이트 = liberty, 다크 = meesae 다크). 다크 스타일이 준비되면 그때 지도를 만들어
 * 조정 전 색이 잠깐 비치지 않게 한다.
 */

import 'maplibre-gl/dist/maplibre-gl.css';

import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  prewarm,
  setWorkerUrl,
  type StyleSpecification,
} from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { fontFamily, layout, useColors, useScheme, type Colors } from '@/ui/theme';

import { markerSize, type MapMarker, type MapViewProps } from './types';
import { useMapStyle, type MapStyle } from './useMapStyle';

// 워커 파일은 public/maplibre 에서 서빙한다 (scripts/copy-maplibre-worker.mjs).
// prewarm 으로 워커 풀을 앱 수명 동안 붙잡아 둔다. 안 그러면 지도를 지웠다 다시 만들 때
// (개발 모드 StrictMode 의 이중 effect, 화면 전환) 풀이 정리되면서 새 지도가 그려지지 않는다.
if (typeof window !== 'undefined') {
  setWorkerUrl(new URL('/maplibre/maplibre-gl-worker.mjs', window.location.href).href);
  prewarm();
}

const asStyle = (s: MapStyle) => s as string | StyleSpecification;

function drawMarkers(
  map: MapLibreMap,
  markers: MapMarker[],
  colors: Colors,
  onPress: (id: string) => void,
): Marker[] {
  return markers.map((m) => {
    const size = markerSize(m.weight);
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.textContent = m.label;
    dot.setAttribute('aria-label', m.label);
    Object.assign(dot.style, {
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      border: `2px solid ${colors.surface}`,
      background: m.highlight ? colors.primary : `${colors.accent}CC`,
      color: colors.textInverse,
      font: `700 12px ${fontFamily}`,
      cursor: 'pointer',
      boxShadow: '0 2px 6px rgba(0,0,0,.18)',
    });
    dot.addEventListener('click', () => onPress(m.id));
    return new Marker({ element: dot }).setLngLat([m.lng, m.lat]).addTo(map);
  });
}

export function MapView({ center, zoom, markers, onMarkerPress }: MapViewProps) {
  const colors = useColors();
  const style = useMapStyle(useScheme());
  const ref = useRef<View>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const styleRef = useRef<MapStyle | null>(null);
  const markerRefs = useRef<Marker[]>([]);

  // effect 안에서 최신 값을 읽기 위한 사본
  const latest = useRef({ center, zoom, markers, colors, onMarkerPress });
  useEffect(() => {
    latest.current = { center, zoom, markers, colors, onMarkerPress };
  });
  const press = (id: string) => latest.current.onMarkerPress?.(id);

  const ready = style !== null;

  // 스타일이 처음 준비되면 지도를 만든다
  useEffect(() => {
    const el = ref.current as unknown as HTMLElement | null;
    if (!el || !style || mapRef.current) return;
    const { center: c, zoom: z, markers: ms, colors: cs } = latest.current;
    const map = new MapLibreMap({ container: el, style: asStyle(style), center: [c.lng, c.lat], zoom: z });
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    map.on('error', (e) => console.warn('[map]', e.error?.message ?? e));
    mapRef.current = map;
    styleRef.current = style;
    markerRefs.current = drawMarkers(map, ms, cs, press);
    return () => {
      markerRefs.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
      styleRef.current = null;
    };
    // 한 번만 만든다. 스타일·중심·마커 변경은 아래 effect 들이 한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // 화면 모드가 바뀌면 스타일만 바꾼다 (마커는 DOM 요소라 유지된다).
  // 처음 넣은 스타일과 같으면 건드리지 않는다 (로딩 중 같은 스타일을 다시 넣으면 그려지지 않는다)
  useEffect(() => {
    if (!mapRef.current || !style || styleRef.current === style) return;
    styleRef.current = style;
    mapRef.current.setStyle(asStyle(style));
  }, [style]);

  useEffect(() => {
    mapRef.current?.jumpTo({ center: [center.lng, center.lat], zoom });
  }, [center.lat, center.lng, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markerRefs.current.forEach((m) => m.remove());
    markerRefs.current = drawMarkers(map, markers, colors, press);
  }, [markers, colors]);

  return <View ref={ref} style={{ flex: 1, minHeight: layout.mapMinHeight, backgroundColor: colors.bg }} />;
}
