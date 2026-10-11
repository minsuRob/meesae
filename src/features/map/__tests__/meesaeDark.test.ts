import { describe, expect, it } from 'vitest';

import { MEESAE_DARK, tuneDarkStyle } from '../meesaeDark';

const base = {
  version: 8,
  sources: {},
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': 'rgb(12,12,12)' } },
    { id: 'water', type: 'fill', paint: { 'fill-color': 'rgb(27,27,29)', 'fill-opacity': 1 } },
    { id: 'railway_dashline', type: 'line', paint: { 'line-color': 'rgb(12,12,12)' } },
    { id: 'place_city', type: 'symbol', paint: { 'text-color': 'rgb(101,101,101)' } },
    { id: 'water_name', type: 'symbol', paint: { 'text-color': 'black' } },
    { id: 'road_oneway', type: 'symbol', layout: { 'icon-image': 'oneway' } },
    { id: 'something_new', type: 'line', paint: { 'line-color': 'red' } },
  ],
};

describe('meesae 다크 지도', () => {
  const tuned = tuneDarkStyle(base);
  const byId = Object.fromEntries(tuned.layers.map((l) => [l.id, l]));

  it('배경·물·점선을 앱 팔레트로 바꾸고 다른 paint 값은 유지한다', () => {
    expect(byId.background!.paint!['background-color']).toBe(MEESAE_DARK.background);
    expect(byId.water!.paint).toEqual({ 'fill-color': MEESAE_DARK.water, 'fill-opacity': 1 });
    expect(byId.railway_dashline!.paint!['line-color']).toBe(MEESAE_DARK.background);
  });

  it('지명은 밝게, 물 이름은 파랗게, 글자 테두리는 바탕색으로', () => {
    expect(byId.place_city!.paint).toMatchObject({ 'text-color': MEESAE_DARK.labelPlace, 'text-halo-color': MEESAE_DARK.labelHalo });
    expect(byId.water_name!.paint!['text-color']).toBe(MEESAE_DARK.labelWater);
  });

  it('글자색이 없는 심볼(아이콘)과 모르는 레이어는 그대로 둔다', () => {
    expect(byId.road_oneway).toBe(base.layers[5]);
    expect(byId.something_new).toBe(base.layers[6]);
  });

  it('원본을 바꾸지 않는다', () => {
    expect(base.layers[0]!.paint!['background-color']).toBe('rgb(12,12,12)');
  });
});
