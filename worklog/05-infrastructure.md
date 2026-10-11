# 05. 인프라 — 실프로젝트 meesae-app 의 현재 상태

- [프로젝트와 앱](#프로젝트와-앱)
- [만들어진 리소스](#만들어진-리소스)
- [배포된 것](#배포된-것)
- [인증 설정](#인증-설정)
- [설정 파일과 비밀값](#설정-파일과-비밀값)
- [켜 둔 GCP API](#켜-둔-gcp-api)

콘솔 체크리스트 원본은 `docs/setup.md` (진행 상황 체크박스 포함).

## 프로젝트와 앱

| 항목 | 값 |
|---|---|
| 프로젝트 ID | `meesae-app` (요금제 Blaze, 결제 통화 KRW) |
| 번들 ID / 패키지 | `com.minsurob.meesae` |
| 앱 등록 | web · iOS · Android (CLI 로 등록) |
| 에뮬레이터 프로젝트 | 개발 `demo-meesae`, Functions 테스트 `demo-meesae-test` |

## 만들어진 리소스

| 리소스 | 위치 | 비고 |
|---|---|---|
| Firestore `(default)` | asia-northeast3 (서울) | CLI 로 생성 |
| Storage 기본 버킷 `meesae-app.firebasestorage.app` | ASIA-NORTHEAST3 | REST API 로 생성 |
| Artifact Registry 정리 정책 | asia-northeast3 | 1일 지난 이미지 자동 삭제 |

## 배포된 것

| 대상 | 상태 |
|---|---|
| Firestore Rules · 인덱스 · Storage Rules | 배포됨 |
| Functions | **29개 배포됨** (callable 26 + onAuthCreate · onImageUploaded · cleanupExpiredShares) |
| `beforeSignIn` | **미배포** — Identity Platform 업그레이드 필요 (보류 결정) |
| 웹 호스팅 | 배포됨 — https://meesae-app.web.app (2026-10-11, `npm run deploy:web`). `/assets/**` 는 해시 파일명이라 1년 immutable 캐시 |

> 첫 배포에 실패했던 함수 12개에는 Cloud Run 공개 호출 권한을 손으로 붙였다.
> 새 함수가 401 이면 → [08-runbook.md#callable-이-401](08-runbook.md#callable-이-401)

## 인증 설정

| 제공업체 | 상태 |
|---|---|
| Google | 켜짐 (공개 이름 `Meesae`) |
| 이메일/비밀번호 | **꺼짐** (스모크 테스트 때만 잠깐 켬) |
| Apple · 휴대폰 | 꺼짐 — 콘솔 작업 필요 |
| App Check | 미등록 → `functions/.env` 의 `ENFORCE_APP_CHECK=false` |

## 설정 파일과 비밀값

| 파일 | 커밋 | 내용 |
|---|---|---|
| `.env` | ✗ | 웹 구성, `EXPO_PUBLIC_USE_EMULATOR`, 구글 웹 클라이언트 ID — `.env.example` 참고 |
| `functions/.env` | ✓ | `ENFORCE_APP_CHECK=false`, `GEOCODER=nominatim` (비밀값 없음) |
| `functions/.env.local` | ✓ | 에뮬레이터용 덮어쓰기 |
| `functions/.env.demo-meesae-test` | ✓ | 테스트용 `GEOCODER=fake` |
| `functions/.secret.local` | ✗ | 에뮬레이터용 더미 비밀값 (없으면 `scripts/ensure-dev-secrets.mjs` 가 만든다) |
| `GoogleService-Info.plist` · `google-services.json` | ✓ | 네이티브 구성 (Google 로그인 반영본) |
| Secret Manager `PHONE_HASH_PEPPER` | — | 무작위 값으로 등록됨 |

저장소가 **공개**다. 클라이언트 API 키는 비밀이 아니지만, GCP 콘솔에서 키 사용 제한을 걸 것 (07-todo P0).

## 켜 둔 GCP API

firestore · firebasestorage · storage · cloudfunctions · cloudbuild · artifactregistry · run · eventarc · pubsub ·
cloudscheduler · secretmanager · firebaserules · **compute**(없으면 첫 배포 실패) · iamcredentials
