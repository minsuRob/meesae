/**
 * 웹 지도: maplibre-gl. DOM 에 직접 그리므로 View 의 nativeID 로 컨테이너를 잡는다.
 */

import 'maplibre-gl/dist/maplibre-gl.css';

import { Map as MapLibreMap, Marker, NavigationControl, prewarm, setWorkerUrl } from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { useColors, useScheme } from '@/ui/theme';

import { MAP_STYLES, markerSize, type MapViewProps } from './types';

// 워커 파일은 public/maplibre 에서 서빙한다 (scripts/copy-maplibre-worker.mjs).
// prewarm 으로 워커 풀을 앱 수명 동안 붙잡아 둔다. 안 그러면 지도를 지웠다 다시 만들 때
// (개발 모드 StrictMode 의 이중 effect, 화면 전환) 풀이 정리되면서 새 지도가 그려지지 않는다.
if (typeof window !== 'undefined') {
  setWorkerUrl(new URL('/maplibre/maplibre-gl-worker.mjs', window.location.href).href);
  prewarm();
}

export function MapView({ center, zoom, markers, onMarkerPress }: MapViewProps) {
  const colors = useColors();
  const scheme = useScheme();
  const ref = useRef<View>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRefs = useRef<Marker[]>([]);
  const pressRef = useRef(onMarkerPress);
  useEffect(() => {
    pressRef.current = onMarkerPress;
  });

  useEffect(() => {
    const el = ref.current as unknown as HTMLElement | null;
    if (!el) return;
    const map = new MapLibreMap({ container: el, style: MAP_STYLES[scheme], center: [center.lng, center.lat], zoom });
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    map.on('error', (e) => console.warn('[map]', e.error?.message ?? e));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // 처음 한 번만 만든다. 중심 이동은 아래 effect 가 한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 화면 모드가 바뀌면 지도 스타일만 바꾼다 (마커는 DOM 요소라 유지된다).
  // 처음 만들 때 넣은 스타일과 같으면 건드리지 않는다 (로딩 중 같은 스타일을 다시 넣으면 그려지지 않는다)
  const styleRef = useRef<string>(MAP_STYLES[scheme]);
  useEffect(() => {
    const next = MAP_STYLES[scheme];
    if (!mapRef.current || styleRef.current === next) return;
    styleRef.current = next;
    mapRef.current.setStyle(next);
  }, [scheme]);

  useEffect(() => {
    mapRef.current?.jumpTo({ center: [center.lng, center.lat], zoom });
  }, [center.lat, center.lng, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markerRefs.current.forEach((m) => m.remove());
    markerRefs.current = markers.map((m) => {
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
        font: '700 12px system-ui, sans-serif',
        cursor: 'pointer',
        boxShadow: '0 1px 4px rgba(0,0,0,.25)',
      });
      dot.addEventListener('click', () => pressRef.current?.(m.id));
      return new Marker({ element: dot }).setLngLat([m.lng, m.lat]).addTo(map);
    });
  }, [markers, colors]);

  return <View ref={ref} style={{ flex: 1, minHeight: 300 }} />;
}
