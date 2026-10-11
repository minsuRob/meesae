import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { useColors } from '../theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: string }) {
  const colors = useColors();
  return <Ionicons name={name} size={size} color={color ?? colors.text} />;
}
