/**
 * 레지스트리 기반 단계 화면. 어떤 단계인지는 URL 의 step 으로 정한다.
 * 내용은 스크롤, 이전·건너뛰기·다음은 아래 고정.
 */

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { validateFields, type FieldErrors } from '@shared/onboarding-schema';

import { call, toApiError } from '@/firebase/api';
import { useDraft } from '@/features/onboarding/draft';
import { STEPS, stepIndex } from '@/features/onboarding/steps';
import { useT } from '@/i18n';
import { useSession, useUid } from '@/store/session';
import { KeyboardAvoid, KeyboardScrollView } from '@/ui/keyboard';
import { Button, ErrorText, Row, Stack, Text } from '@/ui/primitives';
import { layout, space, useColors } from '@/ui/theme';

export default function OnboardingStep() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const { step } = useLocalSearchParams<{ step: string }>();
  const index = stepIndex(step);
  const def = STEPS[index]!;
  const isLast = index === STEPS.length - 1;

  const uid = useUid();
  const draft = useDraft((s) => s.draft);
  const update = useDraft((s) => s.update);
  const reset = useDraft((s) => s.reset);
  const refreshClaims = useSession((s) => s.refreshClaims);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function go(i: number) {
    router.push({ pathname: '/onboarding/[step]', params: { step: STEPS[i]!.id } });
  }

  async function finish() {
    setBusy(true);
    setSubmitError(null);
    try {
      await call('completeOnboarding', { draft });
      reset();
      await refreshClaims(); // onboarded 클레임 → AuthGate 가 메인으로 보낸다
    } catch (e) {
      setSubmitError(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (!uid) return;
    const errs = validateFields(draft, def.fields, { uid, nowMs: Date.now() });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (isLast) void finish();
    else go(index + 1);
  }

  const Body = def.Component;
  const subtitle = t(`onboarding.steps.${def.id}.subtitle`);
  return (
    <KeyboardAvoid style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.lg, paddingTop: space.xl, maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' }}
      >
        <Stack gap={space.xl}>
          <Stack gap={space.sm}>
            <Text variant="micro" tone="muted">
              {t('onboarding.progress', { step: index + 1, total: STEPS.length })}
            </Text>
            <Text variant="display">{t(`onboarding.steps.${def.id}.title`)}</Text>
            {subtitle ? (
              <Text variant="bodySm" tone="muted">
                {subtitle}
              </Text>
            ) : null}
          </Stack>
          <Body draft={draft} update={update} errors={errors} />
          <ErrorText>{submitError}</ErrorText>
        </Stack>
      </KeyboardScrollView>
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.hairline,
          backgroundColor: colors.surface,
          padding: space.lg,
          paddingBottom: Math.max(insets.bottom, space.lg),
        }}
      >
        <Row gap={space.md} style={{ maxWidth: layout.contentMaxWidth, width: '100%', alignSelf: 'center' }}>
          {index > 0 ? <Button title={t('common.previous')} kind="ghost" onPress={() => router.back()} /> : null}
          {def.optional && !isLast ? <Button title={t('common.skip')} kind="ghost" onPress={() => go(index + 1)} /> : null}
          <Button title={isLast ? t('common.start') : t('common.next')} onPress={next} loading={busy} style={{ flex: 1 }} />
        </Row>
      </View>
    </KeyboardAvoid>
  );
}
