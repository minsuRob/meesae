import { setGlobalOptions } from 'firebase-functions/v2';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

if (!getApps().length) initializeApp();

export const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

export const auth = getAuth();
export const bucket = () => getStorage().bucket();

export const IS_EMULATOR = process.env.FUNCTIONS_EMULATOR === 'true';

/** 서버 시계. 테스트에서 바꿔 끼울 수 있게 한 곳에 둔다. */
export const now = () => Date.now();

// 모든 함수의 기본 옵션. 함수 정의보다 먼저 실행돼야 해서 가장 먼저 import 되는 이 파일에 둔다.
setGlobalOptions({ region: 'asia-northeast3', maxInstances: 10 });
