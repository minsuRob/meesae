# worklog — 인덱스

meesae 작업 기록. **전부 읽지 말고, 아래 표에서 지금 필요한 칸만 따라간다.**
각 파일은 맨 위에 목차가 있고, 한 파일에 한 주제만 있다.

마지막 갱신: 2026-10-12 · UI 일괄 개선 (Airbnb 디자인 언어, 브랜치 ui/airbnb-light) · 원본 규칙은 루트 `AGENTS.md`

## 이럴 땐 여기

| 하고 싶은 일 / 궁금한 것 | 바로가기 |
|---|---|
| 처음 왔다, 지금 상태만 빨리 | [아래 상태 요약](#상태-요약) |
| 로컬에서 띄우기 | [08 런북 › 로컬 실행](08-runbook.md#로컬-실행) |
| 실서버에 붙여서 띄우기 | [08 런북 › 실서버에 붙은 웹 실행](08-runbook.md#실서버에-붙은-웹-실행) |
| 다음에 할 일 고르기 | [07 남은 일 › P0 출시 차단](07-todo.md#p0-출시-차단) |
| 앱이 뭘 하는지 (메뉴·정책) | [01 제품](01-product.md) |
| 포인트·무료 횟수 숫자 | [01 제품 › 포인트 정책](01-product.md#포인트-정책) · 바꾸기는 [08 › 포인트 숫자 바꾸기](08-runbook.md#포인트-숫자-바꾸기) |
| 어떤 코드가 어디에 있나 | [02 구조 › 폴더](02-architecture.md#폴더) |
| 코드 고칠 때 지켜야 할 것 | [02 구조 › 설계 원칙](02-architecture.md#설계-원칙) |
| 서버 함수 새로 만들기 | [02 구조 › 서버 쪽 주요 모듈](02-architecture.md#서버-쪽-주요-모듈) → [08 › 새 서버 함수 추가](08-runbook.md#새-서버-함수-추가) |
| 누가 어떤 데이터를 읽고 쓰나 | [03 데이터와 보안 › Firestore 컬렉션](03-data-security.md#firestore-컬렉션) |
| 가입·매치·탈퇴가 어떻게 흐르나 | [03 데이터와 보안 › 주요 흐름](03-data-security.md#주요-흐름) |
| 위치를 어디까지 공개하나 | [03 데이터와 보안 › 위치 공개 범위](03-data-security.md#위치-공개-범위) |
| 지금까지 뭘 했나 (커밋 순) | [04 작업 기록](04-history.md) |
| 이미 겪은 버그와 원인 | [04 작업 기록 › 테스트 중 고친 버그](04-history.md#테스트-중-고친-버그) |
| 사용자와 합의한 결정 | [04 작업 기록 › 사용자와 정한 것](04-history.md#사용자와-정한-것) |
| 실서버에 뭐가 만들어져 있나 | [05 인프라 › 배포된 것](05-infrastructure.md#배포된-것) |
| 로그인 제공업체·App Check 상태 | [05 인프라 › 인증 설정](05-infrastructure.md#인증-설정) |
| .env·비밀값은 어디에 | [05 인프라 › 설정 파일과 비밀값](05-infrastructure.md#설정-파일과-비밀값) |
| 테스트 돌리기 | [06 테스트 › 테스트 종류와 명령](06-testing.md#테스트-종류와-명령) |
| 무엇이 검증됐고 무엇이 아닌가 | [06 테스트 › 검증된 것](06-testing.md#검증된-것) · [검증 안 된 것](06-testing.md#검증-안-된-것) |
| Android APK 만들기·에뮬레이터로 검증 | [08 런북 › Android APK 빌드와 검증](08-runbook.md#android-apk-빌드와-검증) |
| iOS 시뮬레이터 빌드 | [08 런북 › iOS 시뮬레이터 빌드](08-runbook.md#ios-시뮬레이터-빌드) |
| 실서버 자동 테스트 | [08 런북 › 실서버 스모크 테스트](08-runbook.md#실서버-스모크-테스트) |
| 테스트 캡처 보기 | [06 테스트 › 캡처 위치](06-testing.md#캡처-위치) |
| 새 언어 추가 | [08 런북 › 새 언어 추가](08-runbook.md#새-언어-추가) |
| 배포하기 | [08 런북 › 배포](08-runbook.md#배포) |
| 함수가 401 / 배포가 실패 / 지도가 빈 화면 | [08 › callable 이 401](08-runbook.md#callable-이-401) · [첫 배포 대량 실패](08-runbook.md#첫-배포-대량-실패) · [웹 지도가 빈 화면](08-runbook.md#웹-지도가-빈-화면) |
| 브라우저 자동화가 막힐 때 | [08 런북 › 브라우저 자동화 제약](08-runbook.md#브라우저-자동화-제약) |

## 파일

| 파일 | 주제 |
|---|---|
| [01-product.md](01-product.md) | 제품 — 메뉴, 로그인과 권한, 포인트 정책, 온보딩, 언어·화면 모드 |
| [02-architecture.md](02-architecture.md) | 구조 — 폴더, 설계 원칙, 앱·서버 주요 모듈 |
| [03-data-security.md](03-data-security.md) | 데이터와 보안 — 컬렉션, Storage, 주요 흐름, 위치 공개 범위 |
| [04-history.md](04-history.md) | 작업 기록 — 커밋, 고친 버그, 합의한 결정 |
| [05-infrastructure.md](05-infrastructure.md) | 인프라 — meesae-app 리소스·배포·인증·설정 파일·API |
| [06-testing.md](06-testing.md) | 테스트 — 종류·명령·결과, 검증 범위, 캡처 |
| [07-todo.md](07-todo.md) | 남은 일 — P0 / P1 / P2, 작은 개선, 미정 정책 |
| [08-runbook.md](08-runbook.md) | 런북 — 실행·배포·테스트·문제 해결 절차 |

## 상태 요약

- 코드: 웹·iOS·Android 한 코드베이스, 기능 전부 구현, 한국어·영어, 라이트·다크(지도는 meesae 다크). `main` 에 푸시됨
- UI: Airbnb 디자인 언어로 토큰·primitives·전 화면 개편, Pretendard. 브랜치 `ui/airbnb-light` (웹 라이트·다크 캡처까지 확인, 네이티브 미확인 → [07 › UI 일괄 개선 후속](07-todo.md#ui-일괄-개선-후속))
- 서버: `meesae-app`(Blaze) — Firestore·Storage(서울), Rules·인덱스, Functions 29개, 웹 https://meesae-app.web.app. `beforeSignIn` 보류
- 로그인: Google 만 켜짐. Apple·휴대폰 미설정
- 테스트: 단위 41 · Rules 22 · Functions 통합 16 · 실서버 스모크 18 전부 통과, 본인 구글 계정으로 실서버 웹 흐름 확인
- Android: 릴리스 APK 빌드, 에뮬레이터에서 전 흐름 확인 ([06 › Android 네이티브](06-testing.md#android-네이티브)). 실서버 Google 로그인은 SHA-1 등록 전이라 안 됨
- iOS: 시뮬레이터 Release 빌드, 전 흐름 확인 ([06 › iOS 네이티브](06-testing.md#ios-네이티브)). 실기기 서명 팀 미정
- 아직: Android SHA-1 미등록, **App Check 강제 꺼짐** → [07 › P0](07-todo.md#p0-출시-차단)

## 이 폴더 고치는 법

- 새 주제는 새 파일(`09-…md`)로 만들고 위 두 표에 한 줄씩 추가
- 섹션 제목을 바꾸면 링크가 깨진다 → 훅이 자동으로 `python3 worklog/check-links.py` 를 돌려 알려 준다
- 원본 문서(`AGENTS.md`, `docs/*`)와 겹치는 내용은 복사하지 말고 링크

## Claude 가 문서를 읽는 방식

| 언제 | 무엇 | 비용 |
|---|---|---|
| 매 세션 자동 | 루트 `CLAUDE.md`(문서 길잡이 + 작업 후 갱신 규칙) + `AGENTS.md`(코드 규칙) | 짧게 유지 |
| 그 폴더 파일을 열 때만 | `functions/` · `shared/` · `src/i18n/` · `src/ui/` 의 `CLAUDE.md` | 폴더별 5~7줄 |
| 필요할 때만 | 이 README 의 표 → 해당 파일의 해당 섹션 | 섹션 단위 |
| worklog·CLAUDE.md 를 고칠 때 | `.claude/settings.json` 의 PostToolUse 훅이 링크 검사, 깨지면 Claude 에게 알림 | 자동 |
