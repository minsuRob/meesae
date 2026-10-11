import { Redirect } from 'expo-router';

import { STEPS } from '@/features/onboarding/steps';
import { useSession } from '@/store/session';
import { Loading } from '@/ui/primitives';

/** `/` 로 들어오면 세션 상태에 맞는 첫 화면으로 보낸다 */
export default function Index() {
  const status = useSession((s) => s.status);
  const claims = useSession((s) => s.claims);
  if (status === 'loading') return <Loading />;
  if (status === 'signedOut' || claims.banned) return <Redirect href="/sign-in" />;
  if (!claims.onboarded) return <Redirect href={{ pathname: '/onboarding/[step]', params: { step: STEPS[0]!.id } }} />;
  return <Redirect href="/chat" />;
}
