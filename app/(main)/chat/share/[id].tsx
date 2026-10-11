import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocationShareView } from '@/features/chat/LocationShareView';
import { useColors } from '@/ui/theme';

export default function ShareScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <LocationShareView id={id} />
    </SafeAreaView>
  );
}
