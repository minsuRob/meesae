import { useEffect, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { iconSize, motion, radius, space, useColors } from '../theme';

import { Icon, type IconName } from './Icon';
import { Stack } from './Layout';
import { Text } from './Text';

export function Loading() {
  const colors = useColors();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.text} />
    </View>
  );
}

/** 빈 상태. 아이콘은 회색 원 안에 */
export function Empty({ title, body, action, icon }: { title: string; body?: string; action?: ReactNode; icon?: IconName }) {
  const colors = useColors();
  return (
    <Stack style={{ alignItems: 'center', padding: space.xxl }} gap={space.md}>
      {icon ? (
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.bgMuted, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={iconSize.xl} color={colors.textMuted} />
        </View>
      ) : null}
      <Text variant="heading" center>
        {title}
      </Text>
      {body ? (
        <Text variant="bodySm" tone="muted" center>
          {body}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: space.sm }}>{action}</View> : null}
    </Stack>
  );
}

export function ErrorText({ children }: { children?: string | null }) {
  const colors = useColors();
  if (!children) return null;
  return (
    <Text variant="caption" color={colors.danger}>
      {children}
    </Text>
  );
}

/** 진행 막대 (온보딩). 값이 바뀌면 부드럽게 움직인다 */
export function ProgressBar({ value }: { value: number }) {
  const colors = useColors();
  const pct = useSharedValue(Math.round(Math.min(1, Math.max(0, value)) * 100));
  useEffect(() => {
    pct.set(withTiming(Math.round(Math.min(1, Math.max(0, value)) * 100), { duration: motion.duration.slow }));
  }, [value, pct]);
  const anim = useAnimatedStyle(() => ({ width: `${pct.get()}%` }));
  return (
    <View style={{ height: 4, backgroundColor: colors.bgMuted, borderRadius: radius.xs, overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', backgroundColor: colors.text }, anim]} />
    </View>
  );
}
