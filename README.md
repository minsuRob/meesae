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
npm run env:pull               # .env 를 Secret Manager 에서 받는다 (gcloud auth login 필요). 권한이 없으면 cp .env.example .env
npm run emulators               # 터미널 1: Auth·Firestore·Functions·Storage (UI: localhost:4000)
npm run seed                    # 터미널 2: 가짜 사용자 14명·게시물·지역 집계
npm run web                     # 터미널 2: 로그인 화면의 '개발용 로그인' 으로 들어간다
```

## 환경 변수 (.env) 공유

루트 `.env` 의 원본은 GCP Secret Manager(`meesae-app` 프로젝트의 비밀값 `dotenv`)에 있다.
Google 계정으로 `gcloud` 에 로그인만 하면 어느 PC 에서든 같은 `.env` 를 받는다.

처음 한 번:

```bash
gcloud auth login               # meesae-app 에 Secret Manager 접근 권한이 있는 계정
npm run env:pull                # → .env 생성
```

평소:

| 하고 싶은 것 | 명령 | 비고 |
|---|---|---|
| 최신 값 받기 | `npm run env:pull` | 로컬과 다르면 차이(키 이름)만 보여 주고 멈춘다 |
| 받아서 덮어쓰기 | `npm run env:pull -- --force` | 기존 파일은 `.env.bak` 으로 남는다 |
| 고친 값 올리기 | `npm run env:push` | 새 버전으로 올라간다. 원격에만 있는 키를 지우게 되면 멈춘다 |
| 키를 지운 채로 올리기 | `npm run env:push -- --force` | 정말 지울 때만 |
| 무엇이 다른지 보기 | `npm run env:diff` | 키 이름만 출력, 값은 안 보여 준다 |

- 기기마다 다른 값(`EXPO_PUBLIC_USE_EMULATOR` · `EXPO_PUBLIC_EMULATOR_HOST`)은 `.env.local` 에 둔다. Expo 가 `.env` 보다 먼저 읽고, git 에 안 올라간다
- 원격에는 최근 2개 버전만 남는다. 바로 전 값으로 되돌리기:
  `gcloud secrets versions list dotenv --project=meesae-app` 로 번호를 보고
  `gcloud secrets versions access <번호> --secret=dotenv --project=meesae-app > .env`
- 권한이 없는 사람은 `cp .env.example .env` 로 에뮬레이터 전용 설정만 쓸 수 있다
- 자세한 동작: [worklog/08 › .env 공유](worklog/08-runbook.md#env-공유-secret-manager)

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
