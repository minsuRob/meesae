# 02. 구조 — 코드가 어디에 있고 무엇을 지켜야 하나

- [폴더](#폴더)
- [설계 원칙](#설계-원칙)
- [앱 쪽 주요 모듈](#앱-쪽-주요-모듈)
- [서버 쪽 주요 모듈](#서버-쪽-주요-모듈)

## 폴더

```
app/                 expo-router 화면 (로직 없음)
  _layout.tsx        AuthGate: 세션 확인 전엔 아무 라우트도 안 그림 → 로그인 / 온보딩 / 메인
  (auth)/sign-in     로그인 (에뮬레이터면 '개발용 로그인')
  onboarding/[step]  레지스트리 기반 단계 화면
  (main)/            chat · map · feed · profile(me, settings, phone-verify, [uid])
src/
  features/          onboarding · discover · chat · map · feed · points · profile · settings · location
  ui/                theme · primitives · layout(NavBar, SplitPane) · notify · useNow
  i18n/              locales/ko.ts(기준) · en.ts · index.ts(useT, translate) · __tests__
  firebase/          config · api(call, toApiError) · auth/ · collections · hooks · storage · appCheck
  store/             zustand: session · wallet · filters · theme · locale
shared/              앱·Functions 공용 순수 TS
functions/src/       api/ · lib/ · triggers/ · index.ts
tests/               rules/ · functions/
scripts/             seed-emulator · smoke-prod · copy-maplibre-worker · ensure-dev-secrets
docs/                setup · decisions · cost
worklog/             이 폴더
CLAUDE.md            Claude 길잡이 (루트 + functions · shared · src/i18n · src/ui 폴더별)
.claude/             settings.json(문서 링크 검사 훅) · launch.json(web · web-prod)
```

## 설계 원칙

깨면 보안·번역·다크모드가 조용히 망가진다. 자세한 규칙은 루트 `AGENTS.md`.

1. **민감한 쓰기는 전부 Functions.** 클라이언트가 직접 쓰는 곳은 `users_private/{uid}` 의 `filters · fcmTokens · settings` 뿐
2. **권한은 `can()` 하나** (`shared/permissions.ts`). Rules 는 같은 뜻을 손으로 옮긴다 → 한쪽을 바꾸면 다른 쪽도
3. **shared 는 문장을 만들지 않는다.** 검증 실패 `Issue {field, code, limit}`, 서버 오류 `APP_ERRORS` 코드, 시스템 메시지 `systemKey`
4. **shared 는 react·firebase 를 import 하지 않는다.** `shared/__tests__/boundary.test.ts` 가 강제
5. **위치는 구 단위까지만 공개.** 좌표는 users_private 에만
6. **포인트는 `runWalletTx` 만** (`functions/src/lib/ledger.ts`), 멱등키 `clientRequestId`
7. **색은 `useColors()`** (정적 import 금지), **effect 안 동기 setState 금지** (React Compiler 린트)

## 앱 쪽 주요 모듈

| 하려는 것 | 파일 |
|---|---|
| 서버 함수 호출 | `src/firebase/api.ts` 의 `call('이름', 요청)` — 타입은 `shared/api.ts` |
| 오류를 사용자 문구로 | `toApiError(e).message` (코드 → 번역) |
| Firestore 실시간 구독 | `src/firebase/hooks.ts` 의 `useDoc` · `useQuery` · `useAsync` |
| 번역 | `const { t } = useT()` / 컴포넌트 밖 `translate()` |
| 디자인 토큰(순수 TS) | `src/ui/tokens.ts` (팔레트 두 벌·타입 스케일·radius·elevation·motion) |
| 기본 컴포넌트 | `src/ui/primitives/*.tsx` (배럴 `index.tsx`), 개발용 갤러리 `app/dev/ui.tsx` |
| 색·간격 | `src/ui/theme.ts` (`useColors`, `space`, `radius`) |
| 알림·확인 창 | `src/ui/notify.ts` (웹은 window.alert/confirm) |
| 지도 스타일 | `src/features/map/useMapStyle.ts` · `meesaeDark.ts` |

## 서버 쪽 주요 모듈

| 하려는 것 | 파일 |
|---|---|
| 새 callable 추가 | `functions/src/lib/guard.ts` 의 `callable(이름, {action, rate}, handler)` + `shared/api.ts` 계약 + `index.ts` export |
| 포인트 증감 | `runWalletTx(uid, requestId, async (w, tx) => …)` — `w.charge()` / `w.grant()` |
| 오류 던지기 | `appError('CODE')` / 검증 실패는 `invalid(issue)` |
| 레이트리밋 | `functions/src/lib/rateLimit.ts` 의 `RATE` |
| 역지오코딩 | `functions/src/lib/geocode.ts` (GEOCODER = nominatim · google · fake) |
