import { View } from 'react-native';

import { radius, space, useColors, useElevation } from '../theme';

import { Row } from './Layout';
import { Press } from './Pressable';
import { Text } from './Text';

/** 알약 토글 (설정의 언어·화면 모드). 고른 칸이 흰색으로 떠 보인다 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const colors = useColors();
  const elevation = useElevation();
  return (
    <Row gap={0} style={{ backgroundColor: colors.bgMuted, borderRadius: radius.pill, padding: space.xs }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Press
            key={o.value}
            onPress={() => onChange(o.value)}
            haptic="select"
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            containerStyle={{ flex: 1 }}
            style={{
              paddingVertical: space.sm,
              borderRadius: radius.pill,
              alignItems: 'center',
              backgroundColor: on ? colors.surface : 'transparent',
              boxShadow: on ? elevation[1] : undefined,
            }}
          >
            <Text variant="label" tone={on ? 'default' : 'muted'} style={on ? { fontWeight: '600' } : undefined}>
              {o.label}
            </Text>
          </Press>
        );
      })}
    </Row>
  );
}

/** 밑줄 탭 (추천 | 대화, 피드 | 포인트). 활성은 잉크색 글자 + 2px 밑줄 */
export function Tabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: space.xl, paddingHorizontal: space.lg, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Press
            key={o.value}
            onPress={() => onChange(o.value)}
            haptic="select"
            pressScale={1}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={{
              paddingVertical: space.md,
              marginBottom: -1,
              borderBottomWidth: 2,
              borderBottomColor: on ? colors.text : 'transparent',
            }}
          >
            <Text variant="label" tone={on ? 'default' : 'muted'} style={on ? { fontWeight: '600' } : undefined}>
              {o.label}
            </Text>
          </Press>
        );
      })}
    </View>
  );
}
