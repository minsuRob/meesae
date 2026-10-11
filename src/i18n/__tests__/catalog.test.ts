import { describe, expect, it } from 'vitest';

import { APP_ERRORS, REPORT_REASONS } from '@shared/api';
import { COUNTRIES } from '@shared/countries';
import { SHOP_ITEMS } from '@shared/economy';
import { LOCALES } from '@shared/i18n';
import { DRINKING, GENDERS, SMOKING } from '@shared/onboarding-schema';

import { en } from '../locales/en';
import { ko } from '../locales/ko';

/**
 * 번역 카탈로그 점검. 타입이 키 모양을 강제하지만, 런타임에도 한 번 더 본다:
 * 모든 언어가 같은 키·같은 종류(문자열/함수)를 갖고, 함수 메시지가 예시 값으로 문장을 만든다.
 * 새 언어를 넣으면 CATALOGS 에만 추가하면 이 테스트가 같이 검사한다.
 */

const CATALOGS: Record<string, unknown> = { ko, en };
const SAMPLE = { n: 3, min: 2, max: 12, limit: 5, step: 1, total: 9, name: '민수', label: 'Nickname', choice: false, item: 'Boost', cost: 100, desc: 'x', date: 'Oct 11', minutes: 15, country: 'KR' };

type Leaf = { path: string; kind: 'string' | 'function'; value: unknown };

function leaves(node: unknown, prefix = ''): Leaf[] {
  if (typeof node === 'string' || typeof node === 'function') {
    return [{ path: prefix, kind: typeof node as Leaf['kind'], value: node }];
  }
  return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k));
}

const base = leaves(ko);

describe('번역 카탈로그', () => {
  it('지원 언어마다 카탈로그가 있다', () => {
    expect(Object.keys(CATALOGS).sort()).toEqual([...LOCALES].sort());
  });

  for (const [locale, catalog] of Object.entries(CATALOGS)) {
    it(`${locale}: 한국어와 키·종류가 같다`, () => {
      const mine = leaves(catalog);
      expect(mine.map((l) => `${l.path}:${l.kind}`)).toEqual(base.map((l) => `${l.path}:${l.kind}`));
    });

    it(`${locale}: 함수 메시지가 문장을 만든다`, () => {
      for (const l of leaves(catalog)) {
        if (l.kind !== 'function') continue;
        const out = (l.value as (p: object) => string)(SAMPLE);
        expect(out, l.path).toBeTypeOf('string');
        expect(out, l.path).not.toMatch(/undefined|NaN|\[object/);
      }
    });
  }

  it('서버 오류 코드·선택지·국가·상점·신고 사유가 전부 번역돼 있다', () => {
    const paths = new Set(base.map((l) => l.path));
    const need = [
      ...Object.keys(APP_ERRORS).map((c) => `errors.${c}`),
      ...GENDERS.map((g) => `options.gender.${g}`),
      ...DRINKING.map((d) => `options.drinking.${d}`),
      ...SMOKING.map((d) => `options.smoking.${d}`),
      ...COUNTRIES.map((c) => `countries.${c.code}`),
      ...Object.keys(SHOP_ITEMS).flatMap((id) => [`shop.${id}.title`, `shop.${id}.desc`]),
      ...REPORT_REASONS.map((r) => `reportReasons.${r}`),
    ];
    expect(need.filter((p) => !paths.has(p))).toEqual([]);
  });

  it('한국어 조사가 받침에 맞는다', () => {
    expect(ko.auth.devSignInAs({ name: '민수' })).toBe('민수로 로그인');
    expect(ko.auth.devSignInAs({ name: '지훈' })).toBe('지훈으로 로그인');
    expect(ko.validation.required({ label: '닉네임', choice: false })).toBe('닉네임을 입력해 주세요');
    expect(ko.validation.required({ label: '성별', choice: true })).toBe('성별을 선택해 주세요');
    expect(ko.share.status({ name: '하늘', minutes: 5 })).toBe('하늘과 위치공유 중 · 5분 남음');
  });

  it('영어 복수형이 자연스럽다', () => {
    const f = en.points.freeLikesLeft as (p: { n: number }) => string;
    expect(f({ n: 1 })).toBe('1 free like left today');
    expect(f({ n: 2 })).toBe('2 free likes left today');
    expect((en.chat.minutes as (p: { n: number }) => string)({ n: 60 })).toBe('1 hour');
  });
});
