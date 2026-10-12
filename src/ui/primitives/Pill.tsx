import { View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, space, useColors, useElevation } from '../theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type PillTone = 'neutral' | 'outline' | 'onPhoto' | 'primary' | 'success' | 'online';

/**
 * 눌리지 않는 작은 라벨. onPhoto 는 사진 위 흰 알약 (Airbnb 의 '게스트 선호' 배지).
 */
export function Pill({
  label,
  tone = 'neutral',
  icon,
  color,
  style,
}: {
  label: string;
  tone?: PillTone;
  icon?: IconName;
  /** 글자색을 직접 줄 때 (배경은 그 색의 15%) */
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  const elevation = useElevation();
  const bg =
    color != null
      ? `${color}26`
      : tone === 'primary'
        ? colors.primary
        : tone === 'onPhoto' || tone === 'online' || tone === 'outline'
          ? colors.surface
          : colors.bgMuted;
  const fg = color ?? (tone === 'primary' ? colors.onPrimary : tone === 'success' ? colors.success : colors.text);
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.xs,
          height: 24,
          paddingHorizontal: space.sm + space.xxs,
          borderRadius: radius.pill,
          backgroundColor: bg,
          borderWidth: tone === 'outline' ? 1 : 0,
          borderColor: colors.border,
          boxShadow: tone === 'onPhoto' || tone === 'online' ? elevation[1] : undefined,
        },
        style,
      ]}
    >
      {tone === 'online' ? <OnlineDot /> : icon ? <Icon name={icon} size="xs" color={fg} /> : null}
      <Text variant="badge" color={fg} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** 예전 호출부 호환: 색을 주면 그 색 글자 + 15% 배경 */
export function Badge({ label, color }: { label: string; color?: string }) {
  const colors = useColors();
  return <Pill label={label} color={color ?? colors.verified} />;
}

/** 접속 중 점. 실제 lastActiveAt 이 있을 때만 그린다 */
export function OnlineDot({ size = 8, ring }: { size?: number; ring?: boolean }) {
  const colors = useColors();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.online,
        borderWidth: ring ? 2 : 0,
        borderColor: colors.surface,
      }}
    />
  );
}
