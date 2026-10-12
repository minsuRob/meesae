import { control, radius, space, useColors } from '../theme';

import { Icon, type IconName } from './Icon';
import { Press } from './Pressable';
import { Text } from './Text';

/**
 * 선택지 칩. 흰 알약 + 1px 테두리, 고르면 잉크색 2px 테두리와 굵은 글자 (색은 쓰지 않는다).
 */
export function Chip({
  label,
  selected,
  onPress,
  icon,
  small,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  small?: boolean;
}) {
  const colors = useColors();
  return (
    <Press
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      haptic="select"
      style={(pressed) => ({
        height: small ? 32 : control.chip,
        paddingHorizontal: small ? space.md : space.lg,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: selected ? colors.text : colors.border,
        backgroundColor: pressed ? colors.bgMuted : colors.surface,
        boxShadow: selected ? `0 0 0 1px ${colors.text} inset` : undefined,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.xs,
      })}
    >
      {icon ? <Icon name={icon} size="sm" color={colors.text} /> : null}
      <Text variant={small ? 'buttonSm' : 'label'} style={selected ? { fontWeight: '600' } : undefined}>
        {label}
      </Text>
    </Press>
  );
}
