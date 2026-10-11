/**
 * 레지스트리 기반 단계 화면. 어떤 단계인지는 URL 의 step 으로 정한다.
 */

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { validateFields, type FieldErrors } from '@shared/onboarding-schema';

import { call, toApiError } from '@/firebase/api';
import { useDraft } from '@/features/onboarding/draft';
import { STEPS, stepIndex } from '@/features/onboarding/steps';
import { useT } from '@/i18n';
import { useSession, useUid } from '@/store/session';
import { Button, ErrorText, Row, Screen, Stack, Text } from '@/ui/primitives';
import { space } from '@/ui/theme';

export default function OnboardingStep() {
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
    <Screen scroll narrow edges={[]}>
      <Stack gap={space.xl}>
        <Stack gap={space.xs}>
          <Text variant="caption">{t('onboarding.progress', { step: index + 1, total: STEPS.length })}</Text>
          <Text variant="title">{t(`onboarding.steps.${def.id}.title`)}</Text>
          {subtitle ? <Text variant="caption">{subtitle}</Text> : null}
        </Stack>

        <Body draft={draft} update={update} errors={errors} />

        <ErrorText>{submitError}</ErrorText>
        <Row gap={space.md}>
          {index > 0 ? <Button title={t('common.previous')} kind="ghost" onPress={() => router.back()} /> : null}
          {def.optional && !isLast ? <Button title={t('common.skip')} kind="secondary" onPress={() => go(index + 1)} /> : null}
          <Button title={isLast ? t('common.start') : t('common.next')} onPress={next} loading={busy} style={{ flex: 1 }} />
        </Row>
      </Stack>
    </Screen>
  );
}
