/**
 * 잠깐 뜨는 알림. `toast('저장했어요')` 로 띄우고, 루트에 <ToastHost /> 하나만 둔다.
 * 막아야 하는 알림(오류 상세·확인)은 notify/confirm 을 쓴다.
 */

import { View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { control, layout, radius, space, useColors, useElevation } from '../theme';

import { Text } from './Text';

interface ToastItem {
  id: number;
  message: string;
}

interface ToastState {
  items: ToastItem[];
  show: (message: string) => void;
  dismiss: (id: number) => void;
}

const DURATION_MS = 2600;
let seq = 0;

export const useToast = create<ToastState>()((set, get) => ({
  items: [],
  show: (message) => {
    const id = ++seq;
    set({ items: [...get().items.slice(-2), { id, message }] });
    setTimeout(() => get().dismiss(id), DURATION_MS);
  },
  dismiss: (id) => set({ items: get().items.filter((t) => t.id !== id) }),
}));

export function toast(message: string): void {
  useToast.getState().show(message);
}

export function ToastHost() {
  const items = useToast((s) => s.items);
  const colors = useColors();
  const elevation = useElevation();
  const insets = useSafeAreaInsets();
  if (!items.length) return null;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: space.lg,
        right: space.lg,
        bottom: insets.bottom + control.tabBar + space.xl,
        alignItems: 'center',
        gap: space.sm,
      }}
    >
      {items.map((t) => (
        <Animated.View
          key={t.id}
          entering={FadeInDown.duration(200)}
          exiting={FadeOutDown.duration(160)}
          style={{
            maxWidth: layout.contentMaxWidth,
            paddingHorizontal: space.lg,
            paddingVertical: space.md,
            borderRadius: radius.lg,
            backgroundColor: colors.text,
            boxShadow: elevation[2],
          }}
        >
          <Text variant="label" color={colors.bg}>
            {t.message}
          </Text>
        </Animated.View>
      ))}
    </View>
  );
}
