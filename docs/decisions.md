# 결정 기록과 미정 정책

## 정한 것

| 주제 | 결정 | 이유 |
|---|---|---|
| 스택 | Expo SDK 57 + expo-router + Firebase JS SDK + zustand | 기존 프로젝트와 같은 구성, 웹·iOS·Android 한 코드베이스 |
| 네이티브 SDK | RNFirebase 는 전화 인증(verificationId)·App Check 토큰에만 | Expo + JS SDK 는 네이티브에서 reCAPTCHA 를 못 띄운다 |
| 쓰기 경로 | 민감한 쓰기는 전부 callable Functions | 발신자 위조·포인트 조작·차단 우회를 Rules 만으로 막기 어렵다 |
| 문서 분리 | users_public / users_private / users_internal | 공개 필드 화이트리스트, 좌표·전화 해시는 비공개 |
| 위치 공개 범위 | 구 단위 라벨 + 거리 버킷 + geohash 5자리 격자 | 좌표 역추적 방지 |
| 지도 | MapLibre + OpenFreeMap | 키 불필요, 전 세계 |
| 시간 형식 | epoch ms(number) | shared 가 firebase 를 몰라도 되고 JSON 왕복이 쉽다 |
| 멱등 | clientRequestId → `wallets/{uid}/requests` · 메시지/게시물 문서 ID | 재시도 중복 차감·중복 전송 방지 |
| 번역 | ko 기준 카탈로그 + 타입으로 키 강제, 서버는 코드만 | 언어 추가가 파일 하나 |
| 지역 이름 | regionKey 는 현지 이름, 라벨은 언어별로 따로 저장 | 언어를 바꿔도 같은 동네가 같은 키 |
| 다크모드 | 라이트/다크 팔레트 + `useColors()`, 설정에서 시스템/라이트/다크 | |

## 아직 정하지 않은 것

- **하루의 경계**: 지금은 전 세계 KST 자정(`DAY_RESET_UTC_OFFSET_MIN = 540`). 국가별 리셋 여부
- **포인트 충전(유료)**: 인앱 결제(StoreKit/Play Billing·RevenueCat) 미구현. 지금은 무료 적립만
- **Android Apple 로그인**: MVP 제외
- **푸시 알림(FCM)**: `fcmTokens` 필드만 있음. 새 메시지·매치 알림 미구현
- **신고 처리**: 5회 누적 시 자동 숨김(`AUTO_HIDE_REPORTS`)만. 관리자 화면·정지 절차 미정
- **이미지 모더레이션**: `moderateImage()` 훅만 있음 (Vision SafeSearch 등)
- **나이 갱신**: 공개 나이는 가입·수정 시 계산. 생일이 지나면 갱신하는 스케줄러 필요
- **추천 점수**: `shared/score.ts` 가중치 초안. 연애성향·취미·관심사 데이터가 생기면 조정
- **intro 대화 제한**: 상대가 답하기 전 보낼 수 있는 메시지 수 제한 여부
- **게시물 작성자 정보**: 작성 시점 스냅샷. 닉네임을 바꿔도 옛 글은 그대로
