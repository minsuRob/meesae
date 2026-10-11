import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PostDetail } from '@/features/feed/PostDetail';
import { useColors } from '@/ui/theme';

export default function PostScreen() {
  const colors = useColors();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <PostDetail id={postId} />
    </SafeAreaView>
  );
}
