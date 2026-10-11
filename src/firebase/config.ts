/**
 * Firebase JS SDK 초기화. 데이터 접근은 전부 JS SDK 로 한다
 * (RNFirebase 는 네이티브 전화 인증·App Check 토큰에만 쓴다).
 *
 * EXPO_PUBLIC_USE_EMULATOR=1 이면 demo-meesae 에뮬레이터에 붙는다. 실제 프로젝트에는 아무것도 가지 않는다.
 */

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, initializeAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';
import { Platform } from 'react-native';

import { setupAppCheck } from './appCheck';
import { nativePersistence } from './persistence';

export const USE_EMULATOR = process.env.EXPO_PUBLIC_USE_EMULATOR === '1';
export const EMULATOR_PROJECT_ID = 'demo-meesae';
export const FUNCTIONS_REGION = 'asia-northeast3';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'demo-key',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: USE_EMULATOR ? EMULATOR_PROJECT_ID : process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: USE_EMULATOR ? `${EMULATOR_PROJECT_ID}.appspot.com` : process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:0:web:0',
};

/** 에뮬레이터 호스트. 안드로이드 에뮬레이터에서 맥의 localhost 는 10.0.2.2 다. */
export function emulatorHost(): string {
  const custom = process.env.EXPO_PUBLIC_EMULATOR_HOST;
  if (custom) return custom;
  return Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
}

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let fnInstance: Functions | null = null;
let storageInstance: FirebaseStorage | null = null;

export function firebaseApp(): FirebaseApp {
  if (app) return app;
  if (!USE_EMULATOR && !config.projectId) {
    throw new Error('Firebase 구성이 비어 있다. .env.example 을 .env 로 복사해 EXPO_PUBLIC_FIREBASE_* 를 채워라.');
  }
  app = getApps().length ? getApp() : initializeApp(config);
  if (!USE_EMULATOR) {
    try {
      setupAppCheck(app);
    } catch (e) {
      console.warn('App Check 초기화 실패', e);
    }
  }
  return app;
}

export function auth(): Auth {
  if (authInstance) return authInstance;
  const a = firebaseApp();
  const persistence = Platform.OS === 'web' ? null : nativePersistence();
  authInstance = persistence ? initializeAuth(a, { persistence }) : getAuth(a);
  if (USE_EMULATOR) connectAuthEmulator(authInstance, `http://${emulatorHost()}:9099`, { disableWarnings: true });
  return authInstance;
}

export function db(): Firestore {
  if (dbInstance) return dbInstance;
  dbInstance = getFirestore(firebaseApp());
  if (USE_EMULATOR) connectFirestoreEmulator(dbInstance, emulatorHost(), 8080);
  return dbInstance;
}

export function functions(): Functions {
  if (fnInstance) return fnInstance;
  fnInstance = getFunctions(firebaseApp(), FUNCTIONS_REGION);
  if (USE_EMULATOR) connectFunctionsEmulator(fnInstance, emulatorHost(), 5001);
  return fnInstance;
}

export function storage(): FirebaseStorage {
  if (storageInstance) return storageInstance;
  storageInstance = getStorage(firebaseApp());
  if (USE_EMULATOR) connectStorageEmulator(storageInstance, emulatorHost(), 9199);
  return storageInstance;
}
