import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConversationView } from '@/features/chat/ConversationView';
import { useColors } from '@/ui/theme';

export default function ConversationScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ConversationView id={id} />
    </SafeAreaView>
  );
}
