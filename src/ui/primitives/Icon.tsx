import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { iconSize, useColors, type IconSize } from '../theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, size = 'lg', color }: { name: IconName; size?: IconSize | number; color?: string }) {
  const colors = useColors();
  return <Ionicons name={name} size={typeof size === 'number' ? size : iconSize[size]} color={color ?? colors.text} />;
}
