/**
 * 번역. 화면에서는 `const { t } = useT()`, 컴포넌트 밖(알림창·오류 변환)에서는 `translate()`.
 *
 * 새 언어 추가:
 *   1. shared/i18n.ts 의 LOCALES 에 코드 추가 (서버가 그 언어로 지역 이름도 받아 둔다)
 *   2. src/i18n/locales/<code>.ts 를 만들어 Catalog 타입으로 채운다 (빠진 키는 tsc 가 잡는다)
 *   3. 아래 CATALOGS · LOCALE_META 에 등록
 */

import { getLocales, useLocales } from 'expo-localization';
import { useCallback } from 'react';

import { FALLBACK_LOCALE, matchLocale, pickLocalized, type Locale, type Localized } from '@shared/i18n';
import type { Issue } from '@shared/validators';

import { useLocalePref, type LocalePref } from '@/store/locale';

import type { Catalog, MessageKey } from './catalog';
import { en } from './locales/en';
import { ko } from './locales/ko';
import type { Msg, Params } from './types';

export type { MessageKey } from './catalog';

export const CATALOGS: Record<Locale, Catalog> = { ko, en };

/** 언어 선택 화면에 보일 이름(그 언어로 쓴 이름)과 날짜·숫자 형식 태그 */
export const LOCALE_META: Record<Locale, { name: string; tag: string }> = {
  ko: { name: '한국어', tag: 'ko-KR' },
  en: { name: 'English', tag: 'en-US' },
};

export function resolveLocale(pref: LocalePref, deviceTags: (string | null | undefined)[]): Locale {
  if (pref !== 'system') return pref;
  for (const tag of deviceTags) {
    const m = matchLocale(tag);
    if (m) return m;
  }
  return FALLBACK_LOCALE;
}

export function useLocale(): Locale {
  const pref = useLocalePref((s) => s.pref);
  const device = useLocales();
  return resolveLocale(pref, device.map((l) => l.languageTag));
}

export function currentLocale(): Locale {
  return resolveLocale(useLocalePref.getState().pref, getLocales().map((l) => l.languageTag));
}

function lookup(catalog: Catalog, key: string): Msg | undefined {
  let node: unknown = catalog;
  for (const part of key.split('.')) {
    if (node == null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' || typeof node === 'function' ? (node as Msg) : undefined;
}

export function translate(key: MessageKey, params: Params = {}, locale: Locale = currentLocale()): string {
  const msg = lookup(CATALOGS[locale], key) ?? lookup(CATALOGS[FALLBACK_LOCALE], key);
  if (msg === undefined) return key;
  if (typeof msg === 'function') return msg(params);
  return msg.replace(/\{(\w+)\}/g, (_, k: string) => (params[k] != null ? String(params[k]) : `{${k}}`));
}

export type T = (key: MessageKey, params?: Params) => string;

export function useT(): { t: T; locale: Locale; tag: string } {
  const locale = useLocale();
  const t = useCallback<T>((key, params) => translate(key, params, locale), [locale]);
  return { t, locale, tag: LOCALE_META[locale].tag };
}

// ── 자주 쓰는 변환 ──────────────────────────────────────────────────

const CHOICE_FIELDS = new Set(['gender', 'mbti', 'drinking', 'smoking', 'countryCode', 'photos']);

/** shared/validators 의 Issue → 사용자 문구 */
export function issueMessage(issue: Issue, locale: Locale = currentLocale()): string {
  const label = translate(`fields.${issue.field}`, {}, locale);
  return translate(
    `validation.${issue.code}`,
    { label, limit: issue.limit, choice: CHOICE_FIELDS.has(issue.field) },
    locale,
  );
}

/** 서버가 준 지역 이름 중 지금 언어에 맞는 것 */
export function regionName(labels: Localized | undefined, fallback: string | null, locale: Locale): string | null {
  return pickLocalized(labels, locale, fallback);
}

export function timeAgo(ms: number, nowMs: number, t: T): string {
  const s = Math.max(0, (nowMs - ms) / 1000);
  if (s < 60) return t('time.justNow');
  if (s < 3600) return t('time.minutesAgo', { n: Math.floor(s / 60) });
  if (s < 86400) return t('time.hoursAgo', { n: Math.floor(s / 3600) });
  return t('time.daysAgo', { n: Math.floor(s / 86400) });
}

export function formatDateTime(ms: number, tag: string): string {
  return new Date(ms).toLocaleString(tag, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function countryName(code: string, t: T): string {
  const key = `countries.${code.toUpperCase()}` as MessageKey;
  const name = t(key);
  return name === key ? code : name;
}
