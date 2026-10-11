/**
 * 웹 App Check: reCAPTCHA Enterprise. 사이트 키가 없으면(콘솔 등록 전) 건너뛴다.
 * Functions 는 ENFORCE_APP_CHECK 가 켜져 있으면 토큰 없는 호출을 거부한다.
 */

import type { FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

export function setupAppCheck(app: FirebaseApp): void {
  const siteKey = process.env.EXPO_PUBLIC_RECAPTCHA_ENTERPRISE_KEY;
  const debugToken = process.env.EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN;
  if (debugToken) (globalThis as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
  if (!siteKey) return;
  initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(siteKey), isTokenAutoRefreshEnabled: true });
}
