/**
 * 온보딩 레지스트리. 이 배열 하나가 순서·상단 게이지·단계별 검증을 정한다.
 * 항목을 더하거나 빼려면 배열만 고친다. 제목은 번역 카탈로그 onboarding.steps.<id> 에 둔다.
 * (값의 유효성 규칙은 shared/onboarding-schema.ts)
 */

import type { ComponentType } from 'react';

import type { DraftField } from '@shared/onboarding-schema';

import type { ko } from '@/i18n/locales/ko';

import {
  BasicStep,
  CountryStep,
  DrinkingStep,
  JobStep,
  LocationStep,
  MbtiStep,
  PhotosStep,
  SchoolStep,
  SmokingStep,
  type StepProps,
} from './StepViews';

export type StepId = keyof typeof ko.onboarding.steps;

export interface StepDef {
  id: StepId;
  /** 다음 버튼을 누를 때 검사할 필드 */
  fields: DraftField[];
  /** 건너뛰기 버튼을 보여 준다 */
  optional?: boolean;
  Component: ComponentType<StepProps>;
}

export const STEPS: StepDef[] = [
  { id: 'basic', fields: ['nickname', 'birthDate', 'gender'], Component: BasicStep },
  { id: 'photos', fields: ['photos'], Component: PhotosStep },
  { id: 'mbti', fields: ['mbti'], optional: true, Component: MbtiStep },
  { id: 'drinking', fields: ['drinking'], optional: true, Component: DrinkingStep },
  { id: 'smoking', fields: ['smoking'], optional: true, Component: SmokingStep },
  { id: 'job', fields: ['job'], optional: true, Component: JobStep },
  { id: 'school', fields: ['school'], optional: true, Component: SchoolStep },
  { id: 'location', fields: [], optional: true, Component: LocationStep },
  { id: 'country', fields: ['countryCode'], Component: CountryStep },
];

export function stepIndex(id: string | undefined): number {
  const i = STEPS.findIndex((s) => s.id === id);
  return i < 0 ? 0 : i;
}
