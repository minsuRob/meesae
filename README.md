# meesae

가까운 동네에서 시작하는 만남 — Expo(웹·iOS·Android) + Firebase.

- 메뉴: **대화**(추천·필터·대화 목록) · **지도**(구 단위 인원) · **피드**(게시물 + 포인트 허브)
- 로그인: Google / Apple. 휴대폰 인증은 추가 권한(채팅 사진, 실시간 위치공유, 인증 배지)
- 무료 정책: 첫 대화 10회, 좋아요 하루 3회, 위치 인증·출석 포인트
- 한국어 · English, 라이트 · 다크 모드

## 로컬 실행 (에뮬레이터, 비용 0원)

```bash
npm install
npm --prefix functions install
cp .env.example .env            # EXPO_PUBLIC_USE_EMULATOR=1 로 두면 실제 프로젝트에 아무것도 안 간다
npm run emulators               # 터미널 1: Auth·Firestore·Functions·Storage (UI: localhost:4000)
npm run seed                    # 터미널 2: 가짜 사용자 14명·게시물·지역 집계
npm run web                     # 터미널 2: 로그인 화면의 '개발용 로그인' 으로 들어간다
```

## 테스트

```bash
npm test                  # shared 순수 로직 · 경계 · 번역 카탈로그
npm run typecheck         # 앱 + Functions
npm run test:rules        # Firestore/Storage Rules
npm run test:functions    # Functions 통합 (무료 횟수 → 포인트 차감, 멱등키, 차단, 휴대폰 인증)
```

## 구조

```
app/                expo-router 화면 (로직 없음)
src/features/       화면 단위 기능 (onboarding, discover, chat, map, feed, points, profile, settings)
src/ui/             theme(라이트/다크 토큰) · primitives · layout
src/i18n/           번역 카탈로그(ko 기준, en) · useT()
src/firebase/       JS SDK 초기화 · callable 래퍼 · 인증(웹/네이티브 분기)
shared/             앱·Functions 공용 순수 TS (경제·권한·검증·지역·모델·API 계약)
functions/          Cloud Functions v2 (asia-northeast3) — 모든 민감한 쓰기
firestore.rules · storage.rules · tests/
```

규칙은 `AGENTS.md`, 콘솔 작업은 `docs/setup.md`, 미정 정책은 `docs/decisions.md`, 비용은 `docs/cost.md`.
