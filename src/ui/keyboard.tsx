/**
 * 키보드 대응. 웹은 브라우저가 알아서 하므로 그대로 통과한다.
 * 네이티브는 keyboard.native.tsx (안드로이드 edge-to-edge 에서는 adjustResize 가 창을 줄이지 않는다).
 */

import type { ReactNode } from 'react';
import { ScrollView, View, type ScrollViewProps, type ViewProps } from 'react-native';

export function KeyboardRoot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/** 키보드가 올라오면 그 높이만큼 아래 여백을 준다 (채팅 입력줄, 하단 시트) */
export function KeyboardAvoid(props: ViewProps) {
  return <View {...props} />;
}

/** 포커스된 입력칸이 키보드 위로 오도록 스크롤한다 */
export function KeyboardScrollView(props: ScrollViewProps) {
  return <ScrollView {...props} />;
}
