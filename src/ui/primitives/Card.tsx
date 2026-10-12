import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { radius, space, useColors, useElevation, type Elevation } from '../theme';

import { Press } from './Pressable';

export interface CardProps extends ViewProps {
  onPress?: () => void;
  /** 1px 테두리 (기본). 사진 카드처럼 테두리가 없는 카드는 false */
  outlined?: boolean;
  elevation?: Elevation;
  /** 안쪽 여백 (기본 16). 사진이 모서리까지 차는 카드는 false */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({ style, onPress, outlined = true, elevation = 0, padded = true, children, ...rest }: CardProps) {
  const colors = useColors();
  const shadows = useElevation();
  const base: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: outlined ? 1 : 0,
    borderColor: colors.border,
    padding: padded ? space.lg : 0,
    overflow: padded ? undefined : 'hidden',
    boxShadow: shadows[elevation],
  };
  if (onPress) {
    return (
      <Press onPress={onPress} pressScale={0.99} haptic={false} containerStyle={style} style={base} {...rest}>
        {children}
      </Press>
    );
  }
  return (
    <View {...rest} style={[base, style]}>
      {children}
    </View>
  );
}
