/**
 * 네이티브 지도: @maplibre/maplibre-react-native (개발 빌드 필요, Expo Go 불가).
 */

import { Camera, Map, ViewAnnotation } from '@maplibre/maplibre-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/ui/primitives';
import { useColors, useScheme } from '@/ui/theme';

import { MAP_STYLES, markerSize, type MapViewProps } from './types';

export function MapView({ center, zoom, markers, onMarkerPress }: MapViewProps) {
  const colors = useColors();
  const scheme = useScheme();
  return (
    <Map style={{ flex: 1 }} mapStyle={MAP_STYLES[scheme]} attribution logo={false}>
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
