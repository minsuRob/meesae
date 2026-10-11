import type { Leaves, Widen } from './types';
import { ko } from './locales/ko';

/** 모든 언어 카탈로그가 따라야 하는 모양 (한국어 기준) */
export type Catalog = Widen<typeof ko>;
export type MessageKey = Leaves<typeof ko>;
