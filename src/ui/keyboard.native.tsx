/**
 * 네이티브 키보드 대응: react-native-keyboard-controller.
 * 안드로이드 edge-to-edge 에서는 adjustResize 가 창을 줄이지 않아 RN 기본 KeyboardAvoidingView(behavior 없음)로는
 * 입력칸이 키보드에 가려진다. 위치(탭 바·모달)는 automaticOffset 이 계산한다.
 */

import type { ReactNode } from 'react';
import type { ScrollViewProps, ViewProps } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView, KeyboardProvider } from 'react-native-keyboard-controller';

import { space } from './theme';

export function KeyboardRoot({ children }: { children: ReactNode }) {
  return <KeyboardProvider>{children}</KeyboardProvider>;
}

export function KeyboardAvoid(props: ViewProps) {
  return <KeyboardAvoidingView behavior="padding" automaticOffset {...props} />;
}

export function KeyboardScrollView(props: ScrollViewProps) {
  return <KeyboardAwareScrollView bottomOffset={space.lg} {...props} />;
}
