/**
 * 햅틱. 누름·선택·결과 세 종류만 쓴다. 웹은 아무것도 하지 않는다 (Vibration API 는 기기마다 달라 믿을 수 없다).
 * 실패해도 조용히 넘어간다.
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export type HapticKind = 'tap' | 'select' | 'success' | 'error';

export function haptic(kind: HapticKind): void {
  if (Platform.OS === 'web') return;
  let p: Promise<void>;
  if (Platform.OS === 'android') {
    const map = {
      tap: Haptics.AndroidHaptics.Context_Click,
      select: Haptics.AndroidHaptics.Segment_Tick,
      success: Haptics.AndroidHaptics.Confirm,
      error: Haptics.AndroidHaptics.Reject,
    } as const;
    p = Haptics.performAndroidHapticsAsync(map[kind]);
  } else if (kind === 'tap') p = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  else if (kind === 'select') p = Haptics.selectionAsync();
  else if (kind === 'success') p = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else p = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  p.catch(() => undefined);
}
