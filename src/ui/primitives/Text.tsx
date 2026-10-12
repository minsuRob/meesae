import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { fontFamily, type, useColors, type TypeVariant } from '../theme';

export type TextTone = 'strong' | 'default' | 'body' | 'muted' | 'faint' | 'inverse';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  /** 글자색 단계. caption 은 기본이 muted */
  tone?: TextTone;
  /** 직접 색을 줄 때 (tone 보다 우선) */
  color?: string;
  center?: boolean;
  /** 숫자 폭을 고정 (금액·시간처럼 줄맞춤이 필요한 곳) */
  tabular?: boolean;
}

export function Text({ variant = 'body', tone, color, center, tabular, style, ...rest }: TextProps) {
  const colors = useColors();
  const t = tone ?? (variant === 'caption' ? 'muted' : 'default');
  const base =
    t === 'strong'
      ? colors.textStrong
      : t === 'body'
        ? colors.textBody
        : t === 'muted'
          ? colors.textMuted
          : t === 'faint'
            ? colors.textFaint
            : t === 'inverse'
              ? colors.textInverse
              : colors.text;
  return (
    <RNText
      {...rest}
      style={[{ fontFamily, color: color ?? base }, type[variant], center && { textAlign: 'center' }, tabular && { fontVariant: ['tabular-nums'] }, style]}
    />
  );
}
