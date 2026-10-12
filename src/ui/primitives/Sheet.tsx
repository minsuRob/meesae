import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardAvoid } from '../keyboard';
import { layout, radius, space, useColors, useElevation } from '../theme';

import { IconButton } from './Button';
import { Row } from './Layout';
import { Text } from './Text';

/**
 * 아래에서 올라오는 시트. 손잡이 + 제목 + 닫기, 내용은 스크롤, footer 는 아래 고정 (적용 버튼 등).
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
  closeLabel = '닫기',
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel?: string;
}) {
  const colors = useColors();
  const elevation = useElevation();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoid style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }} onPress={onClose} accessibilityLabel={closeLabel}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              maxHeight: '88%',
              width: '100%',
              maxWidth: layout.contentMaxWidth,
              alignSelf: 'center',
              paddingBottom: Math.max(insets.bottom, space.lg),
              boxShadow: elevation[2],
            }}
          >
            <View style={{ alignItems: 'center', paddingTop: space.sm }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
            </View>
            <Row style={{ paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm, justifyContent: 'space-between' }}>
              <Text variant="heading" style={{ flex: 1 }} numberOfLines={1}>
                {title ?? ''}
              </Text>
              <IconButton name="close" label={closeLabel} variant="ghost" size="sm" onPress={onClose} />
            </Row>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: space.lg, paddingVertical: space.sm }}>
              {children}
            </ScrollView>
            {footer ? (
              <View style={{ paddingHorizontal: space.lg, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.hairline }}>{footer}</View>
            ) : null}
          </Pressable>
        </Pressable>
      </KeyboardAvoid>
    </Modal>
  );
}
