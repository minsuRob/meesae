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
  const pos = await currentPosition();
  return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy ?? 9999 };
}

/**
 * 안드로이드는 Balanced 정확도에 Google '위치 정확도'(Wi-Fi·기지국)를 켜 달라는 창을 띄운다.
 * 거절해도 GPS 는 켜져 있을 수 있으니 창 없이 한 번 더, 그래도 없으면 최근 위치(10분 이내)를 쓴다.
 */
async function currentPosition(): Promise<Location.LocationObject> {
  try {
    return await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  } catch {
    try {
      return await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High, mayShowUserSettingsDialog: false });
    } catch {
      const last = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60_000 }).catch(() => null);
      if (last) return last;
      throw appFail('errors.locationUnavailable');
    }
  }
}

/** 위치 인증: 서버가 구 이름을 정하고, 하루 1회 보상을 준다 */
export async function verifyLocation() {
  const c = await currentCoords();
  return call('updateLocation', c);
}
