import { SafeAreaView } from 'react-native-safe-area-context';

import { RegionMapScreen } from '@/features/map/RegionMapScreen';
import { useColors } from '@/ui/theme';

export default function MapTab() {
  const colors = useColors();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <RegionMapScreen />
    </SafeAreaView>
  );
}
