/**
 * 기본 컴포넌트. 화면은 이것들과 theme 토큰만 쓴다.
 * 색은 전부 useColors() 로 받아 라이트/다크 모드를 따라간다.
 */

import { Image, type ImageProps } from 'expo-image';
import { forwardRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text as RNText,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps as RNTextProps,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardAvoid, KeyboardScrollView } from '../keyboard';
import { font, layout, radius, space, useColors, useScheme, type Colors } from '../theme';

import { Icon, type IconName } from './Icon';

export { Icon, type IconName };

// ── Text ─────────────────────────────────────────────────────────────

type Variant = 'title' | 'heading' | 'body' | 'caption' | 'label';

const VARIANT: Record<Variant, TextStyle> = {
  title: { fontSize: font.size.xxl, fontWeight: font.weight.bold },
  heading: { fontSize: font.size.lg, fontWeight: font.weight.bold },
  body: { fontSize: font.size.md },
  caption: { fontSize: font.size.sm },
  label: { fontSize: font.size.sm, fontWeight: font.weight.medium },
};

export interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: string;
  center?: boolean;
}

export function Text({ variant = 'body', color, center, style, ...rest }: TextProps) {
  const colors = useColors();
  const base = variant === 'caption' ? colors.textMuted : colors.text;
  return (
    <RNText
      {...rest}
      style={[{ color: base }, VARIANT[variant], color ? { color } : null, center && { textAlign: 'center' }, style]}
    />
  );
}

// ── Layout ───────────────────────────────────────────────────────────

export interface ScreenProps extends ViewProps {
  scroll?: boolean;
  padded?: boolean;
  /** 데스크톱에서 가운데 정렬 최대 폭 */
  narrow?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function Screen({ scroll, padded = true, narrow, edges = ['top'], style, children, ...rest }: ScreenProps) {
  const colors = useColors();
  const inner: StyleProp<ViewStyle> = [
    padded && { padding: space.lg },
    narrow && { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
    style,
  ];
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.bg }}>
      {scroll ? (
        <KeyboardScrollView contentContainerStyle={inner} keyboardShouldPersistTaps="handled" {...rest}>
          {children}
        </KeyboardScrollView>
      ) : (
        <View style={[{ flex: 1 }, inner]} {...rest}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

export function Row({ style, gap = space.sm, ...rest }: ViewProps & { gap?: number }) {
  return <View {...rest} style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]} />;
}

export function Stack({ style, gap = space.md, ...rest }: ViewProps & { gap?: number }) {
  return <View {...rest} style={[{ gap }, style]} />;
}

export function Spacer({ size = space.md }: { size?: number }) {
  return <View style={{ height: size, width: size }} />;
}

export function Divider() {
  const colors = useColors();
  return <View style={{ height: 1, backgroundColor: colors.border }} />;
}

// ── Button ───────────────────────────────────────────────────────────

type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title: string;
  kind?: ButtonKind;
  loading?: boolean;
  small?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

function buttonBg(colors: Colors, kind: ButtonKind): [string, string] {
  switch (kind) {
    case 'primary':
      return [colors.primary, colors.primaryPressed];
    case 'secondary':
      return [colors.bgMuted, colors.border];
    case 'ghost':
      return ['transparent', colors.bgMuted];
    case 'danger':
      return [colors.danger, colors.dangerPressed];
  }
}

export function Button({ title, kind = 'primary', loading, small, icon, disabled, style, ...rest }: ButtonProps) {
  const colors = useColors();
  const fg = kind === 'primary' || kind === 'danger' ? colors.textInverse : colors.text;
  const bg = buttonBg(colors, kind);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      {...rest}
      style={({ pressed }) => [
        {
          backgroundColor: bg[pressed ? 1 : 0],
          borderRadius: radius.pill,
          paddingVertical: small ? space.sm : space.md,
          paddingHorizontal: small ? space.md : space.xl,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: space.sm,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon}
      <Text variant="label" color={fg} style={{ fontSize: small ? font.size.sm : font.size.md }}>
        {title}
      </Text>
    </Pressable>
  );
}

// ── Card ─────────────────────────────────────────────────────────────

export function Card({ style, onPress, children, ...rest }: ViewProps & { onPress?: () => void }) {
  const colors = useColors();
  const base: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.85 }, style]}>
        {children}
      </Pressable>
    );
  }
  return (
    <View {...rest} style={[base, style]}>
      {children}
    </View>
  );
}

// ── Input ────────────────────────────────────────────────────────────

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  hint?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input({ label, error, hint, style, ...rest }, ref) {
  const colors = useColors();
  const scheme = useScheme();
  return (
    <Stack gap={space.xs}>
      {label ? <Text variant="label">{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textMuted}
        keyboardAppearance={scheme}
        {...rest}
        style={[
          {
            borderWidth: 1,
            borderColor: error ? colors.danger : colors.border,
            borderRadius: radius.md,
            paddingHorizontal: space.md,
            paddingVertical: space.md,
            fontSize: font.size.md,
            color: colors.text,
            backgroundColor: colors.surface,
          },
          style,
        ]}
      />
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

// ── Chip (선택지) ────────────────────────────────────────────────────

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        paddingVertical: space.sm,
        paddingHorizontal: space.lg,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primarySoft : colors.surface,
      }}
    >
      <Text variant="label" color={selected ? colors.onPrimarySoft : colors.text}>
        {label}
      </Text>
    </Pressable>
  );
}

// ── Avatar ───────────────────────────────────────────────────────────

export function Avatar({
  uri,
  size = 40,
  name,
  icon,
}: {
  uri?: string | null;
  size?: number;
  name?: string;
  /** 사진 대신 보여 줄 아이콘 (탈퇴한 사용자 등) */
  icon?: IconName;
}) {
  const colors = useColors();
  const style = { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.bgMuted };
  if (uri && !icon) return <Image source={{ uri }} style={style} contentFit="cover" />;
  return (
    <View style={[style, { alignItems: 'center', justifyContent: 'center' }]}>
      {icon ? (
        <Icon name={icon} size={Math.round(size * 0.5)} color={colors.textMuted} />
      ) : (
        <Text variant="label" color={colors.textMuted}>
          {name?.slice(0, 1) ?? '?'}
        </Text>
      )}
    </View>
  );
}

export function Photo(props: ImageProps & { aspect?: number; rounded?: boolean }) {
  const colors = useColors();
  const { aspect = 3 / 4, rounded = true, style, ...rest } = props;
  return (
    <Image
      contentFit="cover"
      {...rest}
      style={[{ width: '100%', aspectRatio: aspect, backgroundColor: colors.bgMuted }, rounded && { borderRadius: radius.lg }, style]}
    />
  );
}

// ── Badge ────────────────────────────────────────────────────────────

export function Badge({ label, color }: { label: string; color?: string }) {
  const colors = useColors();
  const c = color ?? colors.verified;
  return (
    <View
      style={{
        paddingHorizontal: space.sm,
        paddingVertical: 2,
        borderRadius: radius.pill,
        backgroundColor: `${c}26`,
      }}
    >
      <Text variant="caption" color={c} style={{ fontWeight: font.weight.medium }}>
        {label}
      </Text>
    </View>
  );
}

// ── Progress ─────────────────────────────────────────────────────────

export function ProgressBar({ value }: { value: number }) {
  const colors = useColors();
  return (
    <View style={{ height: 4, backgroundColor: colors.bgMuted, borderRadius: 2, overflow: 'hidden' }}>
      <View
        style={{
          width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`,
          height: '100%',
          backgroundColor: colors.primary,
        }}
      />
    </View>
  );
}

// ── Segmented ────────────────────────────────────────────────────────

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
  return (
    <Row gap={0} style={{ backgroundColor: colors.bgMuted, borderRadius: radius.pill, padding: 3 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={{
              flex: 1,
              paddingVertical: space.sm,
              borderRadius: radius.pill,
              alignItems: 'center',
              backgroundColor: on ? colors.surface : 'transparent',
            }}
          >
            <Text variant="label" color={on ? colors.text : colors.textMuted}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </Row>
  );
}

// ── Sheet (하단 모달) ────────────────────────────────────────────────

export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoid style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }} onPress={onClose}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              padding: space.xl,
              maxHeight: '85%',
              width: '100%',
              maxWidth: layout.contentMaxWidth,
              alignSelf: 'center',
            }}
          >
            {title ? (
              <Text variant="heading" style={{ marginBottom: space.lg }}>
                {title}
              </Text>
            ) : null}
            <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoid>
    </Modal>
  );
}

// ── 상태 표시 ────────────────────────────────────────────────────────

export function Loading() {
  const colors = useColors();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <Stack style={{ alignItems: 'center', padding: space.xxl }} gap={space.sm}>
      <Text variant="heading" center>
        {title}
      </Text>
      {body ? (
        <Text variant="caption" center>
          {body}
        </Text>
      ) : null}
      {action}
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
