/**
 * meesae 다크 지도: OpenFreeMap 'dark' 스타일을 받아 색만 앱 팔레트(#0F0F12 계열)에 맞춰 대비를 높인다.
 * 타일·제공처는 그대로라 비용·라이선스가 같고, 한국어 지명도 유지된다.
 *
 * 레이어 이름으로 색을 덮으므로, 제공처가 레이어를 바꾸면 해당 레이어만 원래 색으로 돌아간다 (지도는 깨지지 않는다).
 * React·지도 라이브러리를 import 하지 않는다 → 단위 테스트에서 그대로 돈다.
 */

export interface StyleLayer {
  id: string;
  type: string;
  paint?: Record<string, unknown>;
  [k: string]: unknown;
}

export interface StyleDoc {
  layers: StyleLayer[];
  [k: string]: unknown;
}

export const MEESAE_DARK = {
  background: '#16161b',
  water: '#0f2a3d',
  waterway: '#16384f',
  residential: '#1c1c22',
  green: '#15231c',
  building: '#25252d',
  roadMinor: '#2e2e38',
  roadMajor: '#3d3d4a',
  motorway: '#5c4652',
  rail: '#34343e',
  boundary: '#5a5a6a',
  labelPlace: '#c4c4d0',
  labelWater: '#7aa6c7',
  labelOther: '#8d8d9b',
  labelHalo: '#0f0f12',
} as const;

const C = MEESAE_DARK;

/** 레이어 id → 덮어쓸 paint */
export const MEESAE_DARK_PAINT: Record<string, Record<string, unknown>> = {
  background: { 'background-color': C.background },
  water: { 'fill-color': C.water },
  waterway: { 'line-color': C.waterway },
  landuse_residential: { 'fill-color': C.residential },
  landcover_wood: { 'fill-color': C.green },
  landuse_park: { 'fill-color': C.green },
  building: { 'fill-color': C.building },
  highway_path: { 'line-color': '#2a2a33' },
  highway_minor: { 'line-color': C.roadMinor },
  highway_major_casing: { 'line-color': 'rgba(90,90,105,0.8)' },
  highway_major_inner: { 'line-color': C.roadMajor },
  highway_major_subtle: { 'line-color': C.roadMajor },
  highway_motorway_casing: { 'line-color': 'rgba(120,90,105,0.8)' },
  highway_motorway_inner: { 'line-color': C.motorway },
  highway_motorway_subtle: { 'line-color': '#4a3a43' },
  railway: { 'line-color': C.rail },
  railway_minor: { 'line-color': C.rail },
  railway_transit: { 'line-color': C.rail },
  boundary_state: { 'line-color': '#4b4b5a' },
  'boundary_country_z0-4': { 'line-color': C.boundary },
  'boundary_country_z5-': { 'line-color': C.boundary },
};

/** 원본을 건드리지 않고 조정된 사본을 돌려준다 */
export function tuneDarkStyle<T extends StyleDoc>(base: T): T {
  const layers = base.layers.map((layer) => {
    let paint = layer.paint;
    const patch = MEESAE_DARK_PAINT[layer.id];
    if (patch) paint = { ...paint, ...patch };
    if (layer.type === 'symbol' && paint?.['text-color'] !== undefined) {
      const color = layer.id === 'water_name' ? C.labelWater : layer.id.startsWith('place_') ? C.labelPlace : C.labelOther;
      paint = { ...paint, 'text-color': color, 'text-halo-color': C.labelHalo, 'text-halo-width': 1.2 };
    }
    // 철도 점선은 바탕색으로 비워 둬야 점선으로 보인다
    if (layer.id.endsWith('_dashline')) paint = { ...paint, 'line-color': C.background };
    return paint === layer.paint ? layer : { ...layer, paint };
  });
  return { ...base, layers };
}
