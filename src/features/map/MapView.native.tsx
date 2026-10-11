/**
 * 네이티브 지도: @maplibre/maplibre-react-native (개발 빌드 필요, Expo Go 불가).
 */

import { Camera, Map, ViewAnnotation } from '@maplibre/maplibre-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/ui/primitives';
import { useColors, useScheme } from '@/ui/theme';

import { markerSize, type MapViewProps } from './types';
import { useMapStyle } from './useMapStyle';

export function MapView({ center, zoom, markers, onMarkerPress }: MapViewProps) {
  const colors = useColors();
  const style = useMapStyle(useScheme());
  // 다크 스타일을 받는 동안은 바탕색만 (조정 전 색이 비치지 않게)
  if (!style) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return (
    <Map style={{ flex: 1 }} mapStyle={style as Parameters<typeof Map>[0]['mapStyle']} attribution logo={false}>
      <Camera initialViewState={{ center: [center.lng, center.lat], zoom }} />
      {markers.map((m) => {
        const size = markerSize(m.weight);
        return (
          <ViewAnnotation key={m.id} id={m.id} lngLat={[m.lng, m.lat]}>
            <Pressable onPress={() => onMarkerPress?.(m.id)}>
              <View
                style={{
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: m.highlight ? colors.primary : `${colors.accent}CC`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: colors.surface,
                }}
              >
                <Text variant="caption" color={colors.textInverse} style={{ fontWeight: '700' }}>
                  {m.label}
                </Text>
              </View>
            </Pressable>
          </ViewAnnotation>
        );
      })}
    </Map>
  );
}
