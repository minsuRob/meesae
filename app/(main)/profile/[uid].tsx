import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileView } from '@/features/profile/ProfileView';
import { useT } from '@/i18n';
import { Button } from '@/ui/primitives';
import { space, useColors } from '@/ui/theme';

export default function ProfileScreen() {
  const colors = useColors();
  const { t } = useT();
  const { uid } = useLocalSearchParams<{ uid: string }>();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Button
        title={`← ${t('common.back')}`}
        kind="ghost"
        small
        style={{ alignSelf: 'flex-start', margin: space.sm }}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/chat'))}
      />
      <ProfileView uid={uid} />
    </SafeAreaView>
  );
}
