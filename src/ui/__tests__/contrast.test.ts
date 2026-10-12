import { describe, expect, it } from 'vitest';

import { palettes, type Colors } from '../tokens';

/**
 * 글자 대비 검사 (WCAG). 본문 쌍은 4.5:1, 아이콘·큰 글자·힌트 쌍은 3:1.
 * 토큰을 바꾸면 여기서 바로 걸린다. 수식은 docs/ui-prototypes 시안 페이지와 같다.
 */

function parse(c: string): [number, number, number, number] {
  if (c.startsWith('#')) {
    const h = c.length === 4 ? [...c.slice(1)].map((x) => x + x).join('') : c.slice(1);
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  const m = /rgba?\(([^)]+)\)/.exec(c);
  if (!m) throw new Error(`색 형식을 모르겠어요: ${c}`);
  const [r, g, b, a = 1] = m[1]!.split(',').map(Number);
  return [r!, g!, b!, a!];
}

function over(fg: string, bg: string): [number, number, number] {
  const [r, g, b, a] = parse(fg);
  const [R, G, B] = parse(bg);
  return [r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a)];
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrast(fg: string, bg: string): number {
  const a = luminance(over(fg, bg));
  const [R, G, B] = parse(bg);
  const b = luminance([R, G, B]);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

type Pair = [keyof Colors, keyof Colors];

/** 본문 글자 (≥ 4.5) */
const BODY: Pair[] = [
  ['text', 'bg'],
  ['text', 'surface'],
  ['text', 'bgMuted'],
  ['text', 'surface3'],
  ['textBody', 'bg'],
  ['textMuted', 'bg'],
  ['textMuted', 'surface'],
  ['textMuted', 'bgMuted'],
  ['onPrimary', 'primaryPressed'],
  ['onBubbleMine', 'bubbleMine'],
  ['text', 'bubbleTheirs'],
  ['pointText', 'pointSoft'],
  ['onPrimarySoft', 'primarySoft'],
  ['textInverse', 'danger'],
];

/** 아이콘·큰 글자·힌트 (≥ 3) */
const UI: Pair[] = [
  ['textFaint', 'bg'],
  ['primary', 'bg'],
  ['onPrimary', 'primary'],
  ['accent', 'bg'],
  ['success', 'bg'],
  ['danger', 'bg'],
  ['verified', 'bg'],
  ['online', 'surface'],
];

describe('색 대비', () => {
  for (const [scheme, colors] of Object.entries(palettes)) {
    for (const [fg, bg] of BODY) {
      it(`${scheme}: ${fg} / ${bg} ≥ 4.5`, () => {
        expect(contrast(colors[fg], colors[bg])).toBeGreaterThanOrEqual(4.5);
      });
    }
    for (const [fg, bg] of UI) {
      it(`${scheme}: ${fg} / ${bg} ≥ 3`, () => {
        expect(contrast(colors[fg], colors[bg])).toBeGreaterThanOrEqual(3);
      });
    }
  }
});
