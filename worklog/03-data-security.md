# 03. 데이터와 보안 — 무엇을 어디에 두고 누가 읽나

- [Firestore 컬렉션](#firestore-컬렉션)
- [Storage 경로](#storage-경로)
- [주요 흐름](#주요-흐름)
- [위치 공개 범위](#위치-공개-범위)

원본: `firestore.rules`, `storage.rules`, `shared/models.ts`. 규칙을 바꾸면 `npm run test:rules`.

## Firestore 컬렉션

기본 deny. 시간은 전부 epoch ms(number).

| 컬렉션 | 읽기 | 쓰기 |
|---|---|---|
| users_public | 온보딩한 사용자, **단건 get 만** (목록 조회 불가, 나를 차단한 사람·숨김 제외) | 서버 |
| users_private | 본인 | 본인(`filters · fcmTokens · settings`만) · 서버 |
| users_internal | 없음 | 서버 (탈퇴 후에도 위험 점수 보존, 개인정보 없음) |
| wallets · wallets/ledger | 본인 | 서버 |
| matches · conversations · messages | 멤버 | 서버 |
| posts · comments | 온보딩한 사용자 (`status == visible` 쿼리) | 서버 |
| location_shares | 멤버 & 만료 전 | 서버 |
| config/economy | 로그인 | 관리자 클레임 |
| likes · reports · rate_limits · phone_index · region_stats · geocode_cache | 없음 | 서버 |

## Storage 경로

| 경로 | 쓰기 | 읽기 |
|---|---|---|
| `users/{uid}/profile/*` | 본인 (온보딩 전에도) | 본인 · 온보딩한 사용자 |
| `posts/{uid}/*` | 본인 | 온보딩한 사용자 |
| `chat/{convId}/{uid}/*` | 본인 + 휴대폰 인증 + 대화 멤버 | 멤버 |

공통: 이미지만, 5MB 이하. 업로드되면 `onImageUploaded` 가 방향 보정 → EXIF 제거 → 1600px JPEG 재저장(`processed: true`).

## 주요 흐름

| 흐름 | 순서 |
|---|---|
| 가입 | 소셜 로그인 → `onAuthCreate`(지갑·내부 문서) → 온보딩 → `completeOnboarding` → `onboarded` 클레임 → 메인 |
| 휴대폰 인증 | 웹 reCAPTCHA / 네이티브 RNFirebase → verificationId → JS SDK `linkWithCredential` → `claimPhoneVerified`(Auth 에서 번호 직접 확인, 해시 인덱스로 다계정 방지) |
| 매치 | 서로 `likeUser` → matches + conversations(kind=match) + 시스템 메시지(`systemKey: matched`) |
| 첫 대화 | `startConversation` → 무료 10회 → 이후 30P, 이미 있는 대화는 무료 |
| 차단 | `blockUser` → 대화 `closedBy`, 추천·프로필·좋아요에서 서로 제외 |
| 탈퇴 | Storage → Firestore → Auth. 상대가 남은 대화는 닫고(`left`), 마지막 사람이면 대화방·메시지·사진 삭제 |
| 정지 | 내부 문서 `banReason` / 클레임 `banned` → 가드가 거부. 로그인 자체 차단(`beforeSignIn`)은 미배포 |

## 위치 공개 범위

- 좌표: `users_private.location` 에만 (본인·서버)
- 공개: `regionLabel`(현지 이름) · `regionLabels`(언어별) · `regionKey`(언어 무관 키)
- 다른 사람과의 거리: 서버가 계산해 **버킷만** (같은 동네·근처·같은 지역·같은 나라·해외)
- 지도 마커: 지역별 인원 + geohash 5자리 격자 중심(약 5km)
- 실시간 위치공유: 휴대폰 인증한 사람만, 15/30/60분, 만료되면 Rules 가 읽기 차단
