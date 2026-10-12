import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileView } from '@/features/profile/ProfileView';
import { useColors } from '@/ui/theme';

export default function ProfileScreen() {
  const colors = useColors();
  const { uid } = useLocalSearchParams<{ uid: string }>();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ProfileView uid={uid} onBack={() => (router.canGoBack() ? router.back() : router.replace('/chat'))} />
    </SafeAreaView>
  );
}
