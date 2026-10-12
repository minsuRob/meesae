/**
 * 누르면 살짝 작아지는 Pressable. 버튼·칩·카드·탭이 전부 이걸 쓴다.
 * 바깥 Pressable 이 자리(containerStyle)를, 안쪽 Animated.View 가 생김새(style)를 맡는다.
 */

import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { haptic, type HapticKind } from '../haptics';
import { motion } from '../theme';

export interface PressProps extends Omit<PressableProps, 'style' | 'children'> {
  /** 생김새. 눌림 상태로 바꿀 수 있다 */
  style?: StyleProp<ViewStyle> | ((pressed: boolean) => StyleProp<ViewStyle>);
  /** 자리 잡기 (flex, margin 등) */
  containerStyle?: StyleProp<ViewStyle>;
  children?: ReactNode | ((pressed: boolean) => ReactNode);
  /** 누를 때 햅틱. false 면 없음 */
  haptic?: HapticKind | false;
  /** 눌렸을 때 크기 */
  pressScale?: number;
}

export function Press({
  style,
  containerStyle,
  children,
  haptic: kind = 'tap',
  pressScale = motion.pressScale,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...rest
}: PressProps) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <Pressable
      disabled={disabled}
      {...rest}
      style={containerStyle}
      onPressIn={(e) => {
        scale.set(withTiming(pressScale, { duration: motion.duration.fast }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withTiming(1, { duration: motion.duration.base }));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (kind) haptic(kind);
        onPress?.(e);
      }}
    >
      {({ pressed }) => (
        <Animated.View style={[anim, typeof style === 'function' ? style(pressed) : style]}>
          {typeof children === 'function' ? children(pressed) : children}
        </Animated.View>
      )}
    </Pressable>
  );
}
