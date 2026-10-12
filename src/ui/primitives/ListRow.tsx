import { Children, isValidElement, type ReactNode } from 'react';
import { View } from 'react-native';

import { control, iconSize, radius, space, useColors } from '../theme';

import { Icon, type IconName } from './Icon';
import { Row, Stack } from './Layout';
import { Press } from './Pressable';
import { Text } from './Text';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** 왼쪽 아이콘 (회색 원 안) */
  icon?: IconName;
  /** 왼쪽에 아이콘 대신 넣을 것 (아바타 등) */
  leading?: ReactNode;
  /** 오른쪽 (버튼·값·배지) */
  trailing?: ReactNode;
  /** 오른쪽 끝 값 글자 */
  value?: string;
  chevron?: boolean;
  onPress?: () => void;
  destructive?: boolean;
  /** 위에 선을 긋는다 (ListGroup 이 첫 행 빼고 켠다) */
  divider?: boolean;
}

/** 설정·포인트의 한 줄. 56pt 이상, 왼쪽 아이콘 + 제목/설명 + 오른쪽 값·셰브런 */
export function ListRow({ title, subtitle, icon, leading, trailing, value, chevron, onPress, destructive, divider }: ListRowProps) {
  const colors = useColors();
  const body = (
    <Row gap={space.md} style={{ minHeight: control.button + space.sm, paddingVertical: space.md }}>
      {leading ??
        (icon ? (
          <View
            style={{
              width: control.iconButton,
              height: control.iconButton,
              borderRadius: radius.pill,
              backgroundColor: colors.surface3,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={icon} size={iconSize.md} color={destructive ? colors.danger : colors.text} />
          </View>
        ) : null)}
      <Stack gap={space.xxs} style={{ flex: 1 }}>
        <Text variant="subtitle" color={destructive ? colors.danger : undefined} style={{ fontWeight: '500' }}>
          {title}
        </Text>
        {subtitle ? <Text variant="bodySm" tone="muted">{subtitle}</Text> : null}
      </Stack>
      {value ? (
        <Text variant="body" tone="muted">
          {value}
        </Text>
      ) : null}
      {trailing}
      {chevron ?? (onPress && !trailing) ? <Icon name="chevron-forward" size="sm" color={colors.textFaint} /> : null}
    </Row>
  );
  const line = divider ? { borderTopWidth: 1, borderTopColor: colors.hairline } : undefined;
  if (onPress) {
    return (
      <Press onPress={onPress} pressScale={1} haptic={false} accessibilityRole="button" style={(pressed) => [line, { backgroundColor: pressed ? colors.bgMuted : 'transparent' }]}>
        {body}
      </Press>
    );
  }
  return <View style={line}>{body}</View>;
}

/** 행 묶음. 테두리 카드 안에 행들이 헤어라인으로 나뉜다 */
export function ListGroup({ children, title }: { children: ReactNode; title?: string }) {
  const colors = useColors();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <Stack gap={space.sm}>
      {title ? (
        <Text variant="heading" style={{ marginBottom: space.xs }}>
          {title}
        </Text>
      ) : null}
      <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: space.lg, overflow: 'hidden' }}>
        {rows.map((child, i) => (
          <View key={child.key ?? i} style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.hairline } : undefined}>
            {child}
          </View>
        ))}
      </View>
    </Stack>
  );
}

/** 섹션 제목 + 오른쪽 액션 */
export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Text variant="heading">{title}</Text>
      {action}
    </Row>
  );
}
