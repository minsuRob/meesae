import { useWindowDimensions } from 'react-native';

import { layout } from '../theme';

export type LayoutMode = 'mobile' | 'desktop';

/** 폭 768 이상이면 desktop (태블릿·폴드 펼침 포함). 화면 분기는 이 훅 하나로만 한다. */
export function useLayoutMode(): LayoutMode {
  const { width } = useWindowDimensions();
  return width >= layout.desktopMinWidth ? 'desktop' : 'mobile';
}
