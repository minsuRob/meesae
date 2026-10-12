import { Image } from 'expo-image';
import { View } from 'react-native';

import { avatarSize, useColors, type AvatarSize } from '../theme';

import { Icon, type IconName } from './Icon';
import { OnlineDot } from './Pill';
import { Text } from './Text';

export function Avatar({
  uri,
  size = 'md',
  name,
  icon,
  verified,
  online,
}: {
  uri?: string | null;
  size?: AvatarSize | number;
  name?: string;
  /** 사진 대신 보여 줄 아이콘 (탈퇴한 사용자 등) */
  icon?: IconName;
  /** 오른쪽 아래 인증 체크 */
  verified?: boolean;
  /** 오른쪽 아래 접속 중 점 */
  online?: boolean;
}) {
  const colors = useColors();
  const px = typeof size === 'number' ? size : avatarSize[size];
  const circle = { width: px, height: px, borderRadius: px / 2, backgroundColor: colors.bgMuted };
  const mark = Math.max(10, Math.round(px * 0.3));
  return (
    <View style={{ width: px, height: px }}>
      {uri && !icon ? (
        <Image source={{ uri }} style={circle} contentFit="cover" transition={150} />
      ) : (
        <View style={[circle, { alignItems: 'center', justifyContent: 'center' }]}>
          {icon ? (
            <Icon name={icon} size={Math.round(px * 0.5)} color={colors.textMuted} />
          ) : (
            <Text variant="label" tone="muted">
              {name?.slice(0, 1) ?? '?'}
            </Text>
          )}
        </View>
      )}
      {verified ? (
        <View
          style={{
            position: 'absolute',
            right: -2,
            bottom: -2,
            width: mark + 4,
            height: mark + 4,
            borderRadius: (mark + 4) / 2,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="checkmark-circle" size={mark} color={colors.verified} />
        </View>
      ) : online ? (
        <View style={{ position: 'absolute', right: 0, bottom: 0 }}>
          <OnlineDot size={Math.max(10, Math.round(px * 0.26))} ring />
        </View>
      ) : null}
    </View>
  );
}
