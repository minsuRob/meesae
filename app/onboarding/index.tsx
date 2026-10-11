import { Redirect } from 'expo-router';

import { STEPS } from '@/features/onboarding/steps';

export default function OnboardingStart() {
  return <Redirect href={{ pathname: '/onboarding/[step]', params: { step: STEPS[0]!.id } }} />;
}
