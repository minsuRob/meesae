/**
 * 알림·확인 창. react-native-web 의 Alert 는 아무것도 안 하므로 웹은 브라우저 창을 쓴다.
 * 버튼 문구는 현재 언어로.
 */

import { Alert, Platform } from 'react-native';

import { translate } from '@/i18n';

export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export function confirm(title: string, message?: string, okLabel?: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: translate('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
      { text: okLabel ?? translate('common.confirm'), onPress: () => resolve(true) },
    ]),
  );
}
