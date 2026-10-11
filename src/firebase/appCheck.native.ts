/**
 * 네이티브 App Check. JS SDK 는 기기 증명(App Attest·Play Integrity)을 못 하므로
 * RNFirebase 가 토큰을 만들고, JS SDK 의 CustomProvider 가 그 토큰을 받아 쓴다.
 * 개발 빌드(__DEV__)는 디버그 공급자 + EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN.
 */

import { getApp } from '@react-native-firebase/app';
import {
  getToken,
  initializeAppCheck as initNative,
  ReactNativeFirebaseAppCheckProvider,
} from '@react-native-firebase/app-check';
import type { FirebaseApp } from 'firebase/app';
import { CustomProvider, initializeAppCheck } from 'firebase/app-check';

export function setupAppCheck(app: FirebaseApp): void {
  const debugToken = process.env.EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN || undefined;
  const provider = new ReactNativeFirebaseAppCheckProvider();
  provider.configure({
    android: { provider: __DEV__ ? 'debug' : 'playIntegrity', debugToken },
    apple: { provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback', debugToken },
  });
  const native = initNative(getApp(), { provider, isTokenAutoRefreshEnabled: true });

  initializeAppCheck(app, {
    provider: new CustomProvider({
      getToken: async () => {
        const { token } = await getToken(native);
        // 실제 만료는 콘솔 설정(기본 1시간). 넉넉히 30분 뒤 다시 받는다.
        return { token, expireTimeMillis: Date.now() + 30 * 60_000 };
      },
    }),
    isTokenAutoRefreshEnabled: true,
  });
}
