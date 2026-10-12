/**
 * 온보딩 공통 틀. 상단 게이지는 현재 단계 / 전체 단계.
 */

import { Stack, useGlobalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDraft } from '@/features/onboarding/draft';
import { STEPS, stepIndex } from '@/features/onboarding/steps';
import { useUid } from '@/store/session';
import { ProgressBar } from '@/ui/primitives';
import { layout, space, useColors } from '@/ui/theme';

export default function OnboardingLayout() {
  const colors = useColors();
  const { step } = useGlobalSearchParams<{ step?: string }>();
  const uid = useUid();
  const claim = useDraft((s) => s.claim);
  useEffect(() => {
    if (uid) claim(uid);
  }, [uid, claim]);

  const progress = (stepIndex(step) + 1) / STEPS.length;
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.md, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}>
        <ProgressBar value={progress} />
      </View>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.bg } }} />
    </SafeAreaView>
  );
}
