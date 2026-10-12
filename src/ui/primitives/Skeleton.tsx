import { useEffect } from 'react';
import { View, type DimensionValue } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { layout, radius, space, useColors } from '../theme';

import { Row, Stack } from './Layout';

/** 로딩 자리 표시. 최종 레이아웃과 같은 모양으로 깜빡인다 */
export function Skeleton({
  width = '100%',
  height = 14,
  round,
  style,
}: {
  width?: DimensionValue;
  height?: DimensionValue;
  round?: boolean;
  style?: object;
}) {
  const colors = useColors();
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(0.45, { duration: 800 }), -1, true));
  }, [pulse]);
  const anim = useAnimatedStyle(() => ({ opacity: pulse.get() }));
  return (
    <Animated.View
      style={[{ width, height, borderRadius: round ? radius.pill : radius.sm, backgroundColor: colors.bgMuted }, anim, style]}
    />
  );
}

/** 추천 카드 자리 */
export function SkeletonCard() {
  return (
    <Stack gap={space.sm}>
      <Skeleton height={undefined} style={{ aspectRatio: layout.photoAspect, borderRadius: radius.lg }} />
      <Skeleton width="60%" height={16} />
      <Skeleton width="80%" height={12} />
    </Stack>
  );
}

/** 목록 행 자리 */
export function SkeletonRow() {
  return (
    <Row gap={space.md} style={{ padding: space.lg }}>
      <Skeleton width={48} height={48} round />
      <Stack gap={space.sm} style={{ flex: 1 }}>
        <Skeleton width="40%" height={14} />
        <Skeleton width="75%" height={12} />
      </Stack>
    </Row>
  );
}

export function SkeletonList({ count = 4, kind = 'row', columns = 1 }: { count?: number; kind?: 'row' | 'card'; columns?: number }) {
  const items = Array.from({ length: count }, (_, i) => i);
  if (kind === 'card') {
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, padding: space.lg }}>
        {items.map((i) => (
          <View key={i} style={{ width: columns > 1 ? `${100 / columns - 3}%` : '100%' }}>
            <SkeletonCard />
          </View>
        ))}
      </View>
    );
  }
  return (
    <View>
      {items.map((i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  );
}
