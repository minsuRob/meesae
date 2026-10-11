import type { ReactNode } from 'react';
import { View } from 'react-native';

import { layout, useColors } from '../theme';
import { useLayoutMode } from './useLayoutMode';

/**
 * desktop: 왼쪽 목록 | 오른쪽 상세 2패널. mobile: 목록만 (상세는 스택으로 push).
 * detail 이 없으면 placeholder 를 보여 준다.
 */
export function SplitPane({ list, detail, placeholder }: { list: ReactNode; detail?: ReactNode; placeholder?: ReactNode }) {
  const colors = useColors();
  const mode = useLayoutMode();
  if (mode === 'mobile') return <View style={{ flex: 1 }}>{list}</View>;
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.bg }}>
      <View style={{ width: layout.listPaneWidth, borderRightWidth: 1, borderRightColor: colors.border }}>{list}</View>
      <View style={{ flex: 1 }}>{detail ?? placeholder}</View>
    </View>
  );
}
