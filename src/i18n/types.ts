/**
 * 번역 카탈로그 타입. 한국어(ko.ts)가 기준이고, 다른 언어는 Catalog 타입을 만족해야 컴파일된다
 * → 키가 하나라도 빠지거나 남으면 tsc 가 잡는다.
 *
 * 값은 문자열('{name}' 치환) 또는 함수. 조사·복수형처럼 언어마다 문법이 다른 곳은 함수로 쓴다.
 */

export type Params = Record<string, any>;
// 함수 메시지의 매개변수 모양은 언어마다 자유롭게 쓴다 (호출은 Params 로 한다)
export type Msg = string | ((p: any) => string);

type Leaf = string | ((...args: any[]) => string);

export type Widen<T> = {
  [K in keyof T]: T[K] extends Leaf ? Msg : Widen<T[K]>;
};

/** 'a.b.c' 형태의 모든 키 */
export type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends Leaf ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];
