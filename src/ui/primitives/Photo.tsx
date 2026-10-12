import { Image, type ImageProps } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { layout, radius, scrim, scrimLocations, space, useColors } from '../theme';

import { IconButton } from './Button';

export function Photo(props: ImageProps & { aspect?: number; rounded?: boolean }) {
  const colors = useColors();
  const { aspect = layout.photoAspect, rounded = true, style, ...rest } = props;
  return (
    <Image
      contentFit="cover"
      transition={200}
      {...rest}
      style={[{ width: '100%', aspectRatio: aspect, backgroundColor: colors.bgMuted }, rounded && { borderRadius: radius.lg }, style]}
    />
  );
}

/**
 * 사진 아래쪽 어두운 스크림. 사진을 감싼 View(position: relative) 안에 둔다.
 * 안의 글자는 colors.scrimText 로.
 */
export function PhotoScrim({ children, style }: { children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <LinearGradient
      colors={scrim}
      locations={scrimLocations}
      pointerEvents="box-none"
      style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '62%', justifyContent: 'flex-end', padding: space.md }, style]}
    >
      {children}
    </LinearGradient>
  );
}

/** 3열 사진 격자의 타일 (온보딩·내 프로필·글쓰기). 오른쪽 위 ×로 지운다 */
export function PhotoTile({ uri, onRemove, removeLabel, aspect = 1 }: { uri?: string | null; onRemove?: () => void; removeLabel: string; aspect?: number }) {
  return (
    <View style={{ width: layout.photoTileWidth }}>
      <Photo source={uri ? { uri } : undefined} aspect={aspect} style={{ borderRadius: radius.sm }} />
      {onRemove ? (
        <View style={{ position: 'absolute', top: space.xs, right: space.xs }}>
          <IconButton name="close" label={removeLabel} variant="onPhoto" size="sm" onPress={onRemove} />
        </View>
      ) : null}
    </View>
  );
}
