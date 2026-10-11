# 콘솔 체크리스트 (사람이 해야 하는 일)

Firebase 프로젝트 `meesae-app` 과 web/iOS/Android 앱 등록, `.env` · `GoogleService-Info.plist` ·
`google-services.json` 은 CLI 로 이미 만들었다. 아래는 콘솔에서만 되는 일이다.

## 진행 상황 (2026-10-11)

- [x] Blaze 요금제 (결제 계정 `Firebase 결제`, KRW)
- [x] Firestore `(default)` · Storage 기본 버킷 — 둘 다 `asia-northeast3`
- [x] Rules · 인덱스 · Storage 규칙 배포
- [x] Functions 배포 (`beforeSignIn` 제외 — Identity Platform 업그레이드 후)
- [x] Authentication 시작 + Google 제공업체 (공개 이름 Meesae)
- [x] `PHONE_HASH_PEPPER` 비밀값 (무작위)
- [x] 실제 프로젝트 스모크 테스트 18/18 (`node scripts/smoke-prod.mjs --yes`, 이메일 로그인을 잠깐 켰다가 끔)
- [ ] App Check 등록 후 `functions/.env` 의 `ENFORCE_APP_CHECK=true` 로 재배포
- [ ] Identity Platform 업그레이드 → `beforeSignIn` 배포
- [ ] Apple · 휴대폰 제공업체, SMS 지역 정책, Android SHA 지문
- [ ] API 키 사용 제한 (저장소가 공개)

## 출시 전 필수

1. **Blaze 요금제** — Functions·전화 인증·Storage 트리거에 필요. 예산 알림을 꼭 건다 (`docs/cost.md`)
2. **Firestore 생성** — 위치 `asia-northeast3`(서울). 그다음 `npm run deploy:backend` 로 Rules·인덱스·Functions 배포
3. **Storage 버킷 생성** — 위치 `asia-northeast3` (트리거 리전과 같아야 한다)
4. **Authentication**
   - Google 제공업체 켜기 → 웹 클라이언트 ID 를 `.env` 의 `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` 에.
     그 뒤 `firebase apps:sdkconfig IOS ... --out GoogleService-Info.plist` 를 **다시** 받아야 iOS URL scheme 이 들어간다
   - Apple 제공업체 켜기 (Apple Developer 에서 Service ID·Key 발급). iOS 는 `usesAppleSignIn` 이 app.json 에 있다
   - 휴대폰 제공업체 켜기 → **SMS 지역 정책**: 서비스 국가만 허용. Android 는 SHA-1/256 지문 등록
   - 승인된 도메인에 웹 호스팅 도메인 추가
5. **Identity Platform 업그레이드** — `beforeSignIn`(정지 계정 차단) 블로킹 함수에 필요. 안 하면 배포가 그 함수에서 실패한다
6. **App Check**
   - 웹: reCAPTCHA Enterprise 키 → `.env` 의 `EXPO_PUBLIC_RECAPTCHA_ENTERPRISE_KEY`
   - iOS: App Attest, Android: Play Integrity 등록
   - 개발 빌드용 디버그 토큰 → `EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN`
   - 준비 전에는 `functions/.env` 의 `ENFORCE_APP_CHECK=false` 로 둘 수 있다 (출시 전에 반드시 true)
7. **비밀값** — `firebase functions:secrets:set PHONE_HASH_PEPPER` (전화번호 해시용 임의 문자열)
8. **역지오코딩** — 기본 Nominatim 은 초당 1회·대량 사용 금지 정책이 있다. 사용자가 늘면
   `functions/.env` 의 `GEOCODER=google` + `firebase functions:secrets:set GOOGLE_GEOCODING_KEY`

## 개발 빌드 (네이티브)

MapLibre·RNFirebase·구글 로그인이 들어 있어 Expo Go 로는 안 돈다.

```bash
npx expo run:ios
npx expo run:android
```

실기기에서 로컬 에뮬레이터에 붙으려면 `.env` 의 `EXPO_PUBLIC_EMULATOR_HOST` 에 맥의 LAN IP.

## 배포 문제 해결

- **첫 배포에서 함수가 대량 실패**: `Compute Engine API has not been used` → `gcloud services enable compute.googleapis.com --project meesae-app` 후 재배포
- **callable 이 401 `unauthenticated` (본문이 HTML 이거나 함수 로그가 없음)**: 첫 배포가 실패했던 함수는 Cloud Run 공개 호출 권한이
  빠진 채 남을 수 있다. 재배포로는 붙지 않는다.

  ```bash
  gcloud run services get-iam-policy <함수이름 소문자> --region asia-northeast3 --project meesae-app
  gcloud run services add-iam-policy-binding <함수이름 소문자> --region asia-northeast3 --project meesae-app --member=allUsers --role=roles/run.invoker
  ```

  callable 은 원래 공개 호출 + 함수 안의 `guard()` 가 인증·권한을 검사하는 구조다. 반영까지 1~2분 걸린다.
- **`onAuthCreate` 배포 실패 (`Firebase Auth is not enabled`)**: 콘솔 Authentication 에서 "시작하기" 를 먼저 누른다

