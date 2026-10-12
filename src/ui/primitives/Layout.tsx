import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardScrollView } from '../keyboard';
import { layout, space, useColors } from '../theme';

export interface ScreenProps extends ViewProps {
  scroll?: boolean;
  padded?: boolean;
  /** 데스크톱에서 가운데 정렬 최대 폭 */
  narrow?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function Screen({ scroll, padded = true, narrow, edges = ['top'], style, children, ...rest }: ScreenProps) {
  const colors = useColors();
  const inner: StyleProp<ViewStyle> = [
    padded && { padding: space.lg },
    narrow && { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
    style,
  ];
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.bg }}>
      {scroll ? (
        <KeyboardScrollView contentContainerStyle={inner} keyboardShouldPersistTaps="handled" {...rest}>
          {children}
        </KeyboardScrollView>
      ) : (
        <View style={[{ flex: 1 }, inner]} {...rest}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

export function Row({ style, gap = space.sm, ...rest }: ViewProps & { gap?: number }) {
  return <View {...rest} style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]} />;
}

export function Stack({ style, gap = space.md, ...rest }: ViewProps & { gap?: number }) {
  return <View {...rest} style={[{ gap }, style]} />;
}

export function Spacer({ size = space.md }: { size?: number }) {
  return <View style={{ height: size, width: size }} />;
}

/** 얇은 구분선. inset 이면 왼쪽을 들여 긋는다 (목록 행 사이) */
export function Divider({ inset, strong }: { inset?: boolean; strong?: boolean }) {
  const colors = useColors();
  return <View style={{ height: 1, backgroundColor: strong ? colors.border : colors.hairline, marginLeft: inset ? space.lg : 0 }} />;
}
