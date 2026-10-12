import { forwardRef, useState, type ReactNode } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { control, fontFamily, noOutline, radius, space, type, useColors, useScheme } from '../theme';

import { Stack } from './Layout';
import { Text } from './Text';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  hint?: string;
  left?: ReactNode;
  right?: ReactNode;
}

/**
 * 입력창. 라벨은 위, 오류·힌트는 아래. 포커스되면 테두리가 잉크색 2px 로 두꺼워진다 (글로우 없음).
 */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, hint, left, right, style, multiline, onFocus, onBlur, editable, ...rest },
  ref,
) {
  const colors = useColors();
  const scheme = useScheme();
  const [focused, setFocused] = useState(false);
  const border = error ? colors.danger : focused ? colors.text : colors.border;
  return (
    <Stack gap={space.sm}>
      {label ? (
        <Text variant="label" tone="muted">
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          gap: space.sm,
          minHeight: control.input,
          borderWidth: 1,
          borderColor: border,
          borderRadius: radius.sm,
          paddingHorizontal: space.md,
          backgroundColor: editable === false ? colors.bgMuted : colors.surface,
          // 포커스 때 1px 더 (안쪽) → 자리가 안 움직인다
          boxShadow: focused && !error ? `0 0 0 1px ${colors.text} inset` : undefined,
        }}
      >
        {left}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textFaint}
          keyboardAppearance={scheme}
          multiline={multiline}
          editable={editable}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
          style={[
            {
              flex: 1,
              fontFamily,
              fontSize: type.body.fontSize,
              paddingVertical: multiline ? space.md : 0,
              color: colors.text,
              minHeight: control.input - 2,
            },
            noOutline,
            style,
          ]}
        />
        {right}
      </View>
      {error ? (
        <Text variant="caption" color={colors.danger}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption">{hint}</Text>
      ) : null}
    </Stack>
  );
});
