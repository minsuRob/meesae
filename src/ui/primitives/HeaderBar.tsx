import type { ReactNode } from 'react';
import { View } from 'react-native';

import { control, space, useColors } from '../theme';

import { IconButton } from './Button';
import { Row } from './Layout';
import { Text } from './Text';

/**
 * 화면 상단 바. [뒤로가기] [왼쪽 슬롯] 제목(또는 워드마크) [오른쪽 슬롯]. 아래에 탭 같은 것을 children 으로 붙인다.
 */
export function HeaderBar({
  title,
  wordmark,
  left,
  right,
  onBack,
  backLabel = '뒤로',
  children,
  hairline = true,
  center,
}: {
  title?: string;
  /** 제목 대신 브랜드 워드마크 */
  wordmark?: boolean;
  left?: ReactNode;
  right?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  children?: ReactNode;
  hairline?: boolean;
  /** 제목을 가운데에 (뒤로가기가 있는 상세 화면) */
  center?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={{ backgroundColor: colors.surface, borderBottomWidth: hairline ? 1 : 0, borderBottomColor: colors.hairline }}>
      <Row style={{ height: control.header, paddingHorizontal: space.lg, gap: space.md }}>
        {onBack ? <IconButton name="chevron-back" label={backLabel} variant="ghost" onPress={onBack} style={{ marginLeft: -space.sm }} /> : null}
        {left}
        <View style={{ flex: 1, alignItems: center ? 'center' : 'flex-start' }}>
          {wordmark ? (
            <Text variant="title" color={colors.primary} style={{ fontWeight: '800', letterSpacing: -0.8 }}>
              meesae
            </Text>
          ) : title ? (
            <Text variant="heading" numberOfLines={1}>
              {title}
            </Text>
          ) : null}
        </View>
        {right ? <Row gap={space.sm}>{right}</Row> : center && onBack ? <View style={{ width: control.iconButton }} /> : null}
      </Row>
      {children}
    </View>
  );
}
