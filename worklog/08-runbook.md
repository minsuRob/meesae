# 08. 런북 — 자주 하는 작업과 문제 해결

- [로컬 실행](#로컬-실행)
- [실서버에 붙은 웹 실행](#실서버에-붙은-웹-실행)
- [배포](#배포)
- [Android APK 빌드와 검증](#android-apk-빌드와-검증)
- [iOS 시뮬레이터 빌드](#ios-시뮬레이터-빌드)
- [실서버 스모크 테스트](#실서버-스모크-테스트)
- [테스트 계정 정리](#테스트-계정-정리)
- [새 언어 추가](#새-언어-추가)
- [포인트 숫자 바꾸기](#포인트-숫자-바꾸기)
- [새 서버 함수 추가](#새-서버-함수-추가)
- [callable 이 401](#callable-이-401)
- [첫 배포 대량 실패](#첫-배포-대량-실패)
- [onAuthCreate 배포 실패](#onauthcreate-배포-실패)
- [웹 지도가 빈 화면](#웹-지도가-빈-화면)
- [웹 아이콘이 ⊠ 로 깨짐](#웹-아이콘이--로-깨짐)
- [브라우저 자동화 제약](#브라우저-자동화-제약)
- [UI 갤러리와 시안](#ui-갤러리와-시안)

## 로컬 실행

```bash
npm install && npm --prefix functions install   # postinstall 이 maplibre 워커를 public/ 에 복사
npm run emulators                               # Auth·Firestore·Functions·Storage, UI localhost:4000
npm run seed                                    # 가짜 사용자 14명·게시물·지역 집계
npm run web                                     # '개발용 로그인' 으로 들어간다
```

`.env` 의 `EXPO_PUBLIC_USE_EMULATOR=1` 이면 실서버에 아무것도 안 간다. 에뮬레이터 휴대폰 인증 코드는 Emulator UI Auth 탭.

## 실서버에 붙은 웹 실행

`.claude/launch.json` 의 `web-prod` (포트 8098). 직접 띄우려면:

```bash
EXPO_PUBLIC_USE_EMULATOR=0 npx expo start --web --port 8098 --clear
```

## 배포

```bash
npm run deploy:backend    # Functions 빌드 + Functions·Firestore·Storage
npm run deploy:web        # expo export → Hosting (https://meesae-app.web.app)
```

`.env` 는 에뮬레이터 모드(`EXPO_PUBLIC_USE_EMULATOR=1`)라서 `deploy:web` 이 `=0` 으로 덮어쓰고 빌드한다.
직접 `expo export` 할 때도 같은 값을 붙인다. 안 붙이면 웹이 demo 에뮬레이터에 붙는다.

`beforeSignIn` 은 Identity Platform 전까지 빼고 배포한다 (`--only functions:이름,...`).

## Android APK 빌드와 검증

준비: Android Studio 의 JDK·SDK (`~/.zshrc` 에 `JAVA_HOME`·`ANDROID_HOME`). 처음 한 번 에뮬레이터와 이미지:

```bash
sdkmanager "emulator" "system-images;android-36;google_apis_playstore;arm64-v8a"
avdmanager create avd -n meesae_api36 -k "system-images;android-36;google_apis_playstore;arm64-v8a" -d pixel_7
```

실서버용 APK (`android/` 는 git 제외, 생성물):

```bash
npx expo prebuild -p android --clean --no-install
cd android && EXPO_PUBLIC_USE_EMULATOR=0 ./gradlew assembleRelease --no-daemon \
  -PreactNativeArchitectures=arm64-v8a,armeabi-v7a --max-workers=4 -Dorg.gradle.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1g"
# → android/app/build/outputs/apk/release/app-release.apk (디버그 키 서명)
```

`SDK location not found` 면 `export ANDROID_HOME=$HOME/Library/Android/sdk` 후 다시. 실기기 한 대만 쓸 때는 `-PreactNativeArchitectures=arm64-v8a` 로 줄여도 된다.

에뮬레이터 백엔드용 APK: `.env` 그대로(`=1`) 빌드하되, 릴리스는 http 를 막으므로 생성된
`android/app/src/main/AndroidManifest.xml` 의 `<application>` 에 `android:usesCleartextTraffic="true"` 를 손으로 넣는다
(prebuild `--clean` 하면 사라진다 — 실서버 APK 에는 넣지 않는다). 에뮬레이터는 `10.0.2.2` 로 맥의 Firebase 에뮬레이터에 붙는다.

- 맥 메모리 16GB 에서 Gradle 과 에뮬레이터를 같이 돌리면 에뮬레이터가 멈추거나 Gradle 데몬이 죽는다 → 빌드할 땐 `adb emu kill`
- 창 모드 에뮬레이터가 한 번 죽은 뒤로는 부팅이 멈췄다 → `emulator -avd meesae_api36 -no-window -no-snapshot -gpu swiftshader_indirect -memory 3072`
- 조작은 `adb shell input tap/text`, 요소 좌표는 `uiautomator dump`, 화면은 `adb exec-out screencap -p`. 한글은 `input text` 로 못 넣는다
- 위치: `adb emu geo fix <경도> <위도>`. 사진: `adb push x.jpg /sdcard/Pictures/` 후 미디어 스캔 브로드캐스트
- 휴대폰 인증번호는 에뮬레이터 로그의 `use the code ...`

## iOS 시뮬레이터 빌드

```bash
npx expo prebuild -p ios --no-install
cd ios && LANG=en_US.UTF-8 pod install --repo-update     # UTF-8 아니면 CocoaPods 가 인코딩 오류로 죽는다
EXPO_PUBLIC_USE_EMULATOR=0 xcodebuild -workspace meesae.xcworkspace -scheme meesae -configuration Release \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath build \
  ARCHS=arm64 ONLY_ACTIVE_ARCH=YES CODE_SIGNING_ALLOWED=NO
# → ios/build/Build/Products/Release-iphonesimulator/meesae.app  (xcrun simctl install <기기> meesae.app)
```

- `=0` 을 빼면 `.env` 대로 에뮬레이터(127.0.0.1)에 붙는다. iOS 는 ATS `NSAllowsLocalNetworking` 이라 http 로컬이 된다
- RNFirebase 는 `app.json` 에서 SPM 을 끈다 (`ios.disableSPM`) — 정적 프레임워크와 같이 쓰면 pod install 이 막힌다
- 사진·위치: `xcrun simctl addmedia <기기> a.jpg`, `xcrun simctl location <기기> set 37.5894,127.0167`
- 실기기 .ipa 는 Apple 팀 서명 필요. 맥에 로그인된 인증서는 회사 팀 것이라 쓰지 않기로 함 (2026-10-12)

## 실서버 스모크 테스트

테스트 계정 2개로 가입→지오코딩→추천→매치→대화→Rules 거부→피드→포인트→차단→탈퇴까지 돌고 스스로 지운다.

1. 이메일 로그인 켜기 (끝나면 반드시 끈다):
   ```bash
   TOKEN=$(gcloud auth print-access-token)
   curl -s -X PATCH -H "Authorization: Bearer $TOKEN" -H "X-Goog-User-Project: meesae-app" -H "Content-Type: application/json" \
     "https://identitytoolkit.googleapis.com/admin/v2/projects/meesae-app/config?updateMask=signIn.email.enabled,signIn.email.passwordRequired" \
     -d '{"signIn":{"email":{"enabled":true,"passwordRequired":true}}}'
   ```
2. `GCLOUD_TOKEN=$(gcloud auth print-access-token) node scripts/smoke-prod.mjs --yes`
3. 같은 요청에 `"enabled":false` 로 끈다

## 테스트 계정 정리

스모크가 중간에 죽어 `smoke-*@meesae.test` 계정이 남았을 때: Identity Toolkit REST(`accounts:query` → `accounts:update` 로 비밀번호 재설정)
→ 그 계정으로 로그인 → `deleteAccount` 호출. 로컬 ADC 가 만료돼 있으면 Admin SDK 대신 gcloud 토큰 + `X-Goog-User-Project` 헤더로 REST.

## 새 언어 추가

1. `shared/i18n.ts` 의 `LOCALES` 에 코드 추가 (서버가 그 언어 지역 이름도 받아 둔다)
2. `src/i18n/locales/<code>.ts` 를 `Catalog` 타입으로 작성 — 빠진 키는 tsc 가 잡는다
3. `src/i18n/index.ts` 의 `CATALOGS` · `LOCALE_META` 에 등록 → 언어 선택 UI 에 자동으로 나온다
4. `npm test` (카탈로그 일치 테스트) → Functions 재배포

## 포인트 숫자 바꾸기

- 기본값: `shared/economy.ts` 의 `ECONOMY` (앱·서버 같이 바뀜, 재배포 필요)
- 운영 중 즉시: Firestore `config/economy` 문서에 같은 키로 숫자를 넣는다 (서버 5분 캐시)

## 새 서버 함수 추가

1. `shared/api.ts` 의 `Api` 에 요청·응답 타입
2. `functions/src/api/*.ts` 에 `callable('이름', { action, rate }, handler)`
3. `functions/src/index.ts` export → `npm run test:functions` → 배포
4. 오류는 `appError('CODE')` — 새 코드면 `shared/api.ts` `APP_ERRORS` + 앱 카탈로그 `errors.CODE` (ko·en)

## callable 이 401

본문이 함수의 `{"error":{"status":"UNAUTHENTICATED"}}` 가 아니라 Cloud Run 거절이면 공개 호출 권한 누락. 재배포로는 안 붙는다.

```bash
gcloud run services get-iam-policy <함수이름소문자> --region asia-northeast3 --project meesae-app
gcloud run services add-iam-policy-binding <함수이름소문자> --region asia-northeast3 --project meesae-app --member=allUsers --role=roles/run.invoker
```

반영까지 1~2분. 인증·권한 검사는 함수 안 `guard()` 가 한다.

## 첫 배포 대량 실패

`Compute Engine API has not been used` → `gcloud services enable compute.googleapis.com --project meesae-app` 후 재배포.

## onAuthCreate 배포 실패

`Firebase Auth is not enabled in the project` → 콘솔 Authentication "시작하기" 를 먼저.

## 웹 지도가 빈 화면

1. `public/maplibre/maplibre-gl-worker.mjs` 가 있는지 (`npm run postinstall`)
2. 브라우저 탭이 숨겨져 있으면(`document.visibilityState === 'hidden'`) maplibre 가 안 그린다 — 코드 문제 아님
3. 다크는 원래 어둡다. 확대해서 지명이 보이면 정상

## 웹 아이콘이 ⊠ 로 깨짐

아이콘 폰트(Ionicons)를 못 받은 것. `curl -sI https://meesae-app.web.app/assets/node_modules/@expo/vector-icons/.../Ionicons.<hash>.ttf`
가 `text/html` 이면 Hosting 이 파일을 안 올리고 SPA rewrite 로 index.html 을 준 것이다.
`firebase.json` 의 `hosting.ignore` 에 `node_modules` 패턴을 넣지 않는다 — expo export 는 폰트·이미지를 `dist/assets/node_modules/` 아래에 둔다.

## 브라우저 자동화 제약

Claude 브라우저 패널에서는 에이전트 클릭으로 연 팝업(구글 로그인·결제 창)과 위치 권한이 막힌다.
로그인·결제·위치 허용은 사람이 하고, 이후 단계부터 이어서 자동화한다. 확인 창(`window.confirm`)은
테스트 탭에서만 기록용으로 바꿔 끼워 진행했다.

## UI 갤러리와 시안

- 디자인 시안(HTML 한 장, 빌드 없음): `docs/ui-prototypes/*.html`. 브라우저로 보려면 `public/qa-ui/`(gitignore)에 복사하고 `npm run web` 뒤 `http://localhost:8097/qa-ui/<파일>` 로 연다. `?variant=` `?screen=` `?focus=1`(캡처용 스크롤) 쿼리
- 앱 안 갤러리: 개발 모드 웹에서 `/dev/ui`. 라이트·다크 두 열에 모든 primitive 와 팔레트가 나란히 뜬다
- 토큰을 바꾸면 `npx vitest run src/ui` 로 대비를 먼저 확인한다
- dev 로그인 계정을 온보딩 없이 메인으로 보내려면 (에뮬레이터 전용): 로그인 한 번 한 뒤 `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` 으로 firebase-admin 스크립트를 돌려 `auth.listUsers()` 에서 uid 를 찾고 `users_public/{uid}`·`users_private/{uid}` 를 seed 형식으로 쓰고 `setCustomUserClaims(uid, { onboarded: true })`. 그 뒤 브라우저에서 `firebaseLocalStorageDb` IndexedDB 를 지우고 다시 로그인해야 새 클레임이 토큰에 실린다
