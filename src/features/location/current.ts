/**
 * 현재 좌표 + 위치 인증. 온보딩·포인트 허브·위치공유가 같이 쓴다.
 */

import * as Location from 'expo-location';

import { appFail, call } from '@/firebase/api';

export interface Coords {
  lat: number;
  lng: number;
  accuracy: number;
}

export async function currentCoords(): Promise<Coords> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (!perm.granted) throw appFail('errors.locationPermission');
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy ?? 9999 };
}

/** 위치 인증: 서버가 구 이름을 정하고, 하루 1회 보상을 준다 */
export async function verifyLocation() {
  const c = await currentCoords();
  return call('updateLocation', c);
}
