import type { ReactNode } from 'react';
import { ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';

import { control, iconSize, radius, space, useColors, useElevation, type Colors } from '../theme';

import { Icon, type IconName } from './Icon';
import { Press, type PressProps } from './Pressable';
import { Text } from './Text';

type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends Omit<PressProps, 'children' | 'style' | 'containerStyle'> {
  title: string;
  kind?: ButtonKind;
  loading?: boolean;
  small?: boolean;
  /** 알약 모양 (작은 보조 액션) */
  pill?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

function look(colors: Colors, kind: ButtonKind, pressed: boolean, disabled: boolean): ViewStyle & { fg: string } {
  switch (kind) {
    case 'primary':
      return {
        backgroundColor: disabled ? colors.primaryDisabled : pressed ? colors.primaryPressed : colors.primary,
        fg: colors.onPrimary,
      };
    case 'secondary':
      return {
        backgroundColor: pressed ? colors.bgMuted : colors.surface,
        borderWidth: 1,
        borderColor: disabled ? colors.borderStrong : colors.text,
        fg: disabled ? colors.textFaint : colors.text,
      };
    case 'ghost':
      return { backgroundColor: pressed ? colors.bgMuted : 'transparent', fg: disabled ? colors.textFaint : colors.text };
    case 'danger':
      return { backgroundColor: pressed ? colors.dangerPressed : colors.danger, fg: colors.textInverse };
  }
}

export function Button({ title, kind = 'primary', loading, small, pill, icon, disabled, style, ...rest }: ButtonProps) {
  const colors = useColors();
  const off = Boolean(disabled || loading);
  return (
    <Press
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      disabled={off}
      containerStyle={style}
      {...rest}
      style={(pressed) => {
        const { fg: _fg, ...bg } = look(colors, kind, pressed, off);
        return {
          ...bg,
          height: small ? control.buttonSm : control.button,
          borderRadius: pill ? radius.pill : radius.sm,
          paddingHorizontal: small ? space.lg : space.xl,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: space.sm,
          opacity: off && kind !== 'primary' ? 0.6 : 1,
        };
      }}
    >
      {(pressed) => {
        const { fg } = look(colors, kind, pressed, off);
        return (
          <>
            {loading ? <ActivityIndicator color={fg} /> : icon}
            <Text variant={small ? 'buttonSm' : 'button'} color={fg} numberOfLines={1}>
              {title}
            </Text>
          </>
        );
      }}
    </Press>
  );
}

type IconButtonVariant = 'tonal' | 'ghost' | 'filled' | 'onPhoto' | 'outline';

export interface IconButtonProps extends Omit<PressProps, 'children' | 'style' | 'containerStyle'> {
  name: IconName;
  /** 스크린리더용 이름 (필수) */
  label: string;
  variant?: IconButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** 아이콘만 있는 원형 버튼. 44pt 터치 영역은 hitSlop 으로 채운다 */
export function IconButton({ name, label, variant = 'tonal', size = 'md', color, style, disabled, ...rest }: IconButtonProps) {
  const colors = useColors();
  const elevation = useElevation();
  const px = size === 'sm' ? 32 : size === 'lg' ? 56 : control.iconButton;
  const bg =
    variant === 'tonal'
      ? colors.surface3
      : variant === 'filled'
        ? colors.primary
        : variant === 'onPhoto'
          ? colors.surface
          : variant === 'outline'
            ? colors.surface
            : 'transparent';
  const fg = color ?? (variant === 'filled' ? colors.onPrimary : colors.text);
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={px < 44 ? (44 - px) / 2 : 0}
      containerStyle={style}
      {...rest}
      style={(pressed) => ({
        width: px,
        height: px,
        borderRadius: radius.pill,
        backgroundColor: pressed && variant === 'ghost' ? colors.bgMuted : bg,
        borderWidth: variant === 'outline' ? 1 : 0,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.45 : pressed && variant === 'filled' ? 0.9 : 1,
        boxShadow: variant === 'onPhoto' || size === 'lg' ? elevation[1] : undefined,
      })}
    >
      <Icon name={name} size={size === 'sm' ? iconSize.sm : size === 'lg' ? iconSize.xl : iconSize.lg} color={fg} />
    </Press>
  );
}

/** 떠 있는 동작 버튼 (글쓰기 등). 자리는 부모가 absolute 로 잡는다 */
export function FAB(props: Omit<IconButtonProps, 'variant' | 'size'>) {
  return <IconButton variant="filled" size="lg" {...props} />;
}
