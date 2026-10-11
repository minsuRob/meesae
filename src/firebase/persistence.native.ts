/**
 * iOS·안드로이드용 인증 저장소. AsyncStorage 를 끼워야 앱을 다시 켜도 로그인이 유지된다.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as firebaseAuth from 'firebase/auth';
import type { Persistence } from 'firebase/auth';

type WithReactNative = {
  getReactNativePersistence?: (storage: unknown) => Persistence;
};

export function nativePersistence(): Persistence | null {
  const factory = (firebaseAuth as unknown as WithReactNative).getReactNativePersistence;
  return factory ? factory(AsyncStorage) : null;
}
