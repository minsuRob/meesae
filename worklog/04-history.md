# 04. 작업 기록 (2026-10-11)

- [골격에서 기능까지](#골격에서-기능까지)
- [실프로젝트 배포와 테스트](#실프로젝트-배포와-테스트)
- [테스트 중 고친 버그](#테스트-중-고친-버그)
- [사용자와 정한 것](#사용자와-정한-것)
- [UI 일괄 개선](#ui-일괄-개선)

계획서(`~/.claude/plans/indexed-honking-candy.md`)를 바탕으로 빈 저장소에서 시작했다.

## 골격에서 기능까지

커밋 8개, 분류별.

| 커밋 | 내용 |
|---|---|
| `5a923b0` | Expo SDK 57 앱, 의존성, Firebase 프로젝트 `meesae-app` CLI 생성, web/iOS/Android 앱 등록, 에뮬레이터 구성 |
| `e5b49af` | `shared/` 순수 로직 (경제·권한·검증·지역·geohash·추천 점수·모델·API 계약) + 경계·단위 테스트 |
| `c6f7a7f` | Cloud Functions (가드·원장·레이트리밋·지오코딩, 27 callable + 트리거 3) |
| `8947b10` | Firestore·Storage Rules, 인덱스, Rules 테스트 |
| `5fec039` | 앱 기반: 테마(라이트/다크)·기본 컴포넌트·번역(ko/en)·스토어·Firebase 클라이언트 |
| `6b843ac` | 화면 전부 |
| `22a1081` | Functions 통합 테스트 + 에뮬레이터 시드 |
| `711bdfe` | AGENTS.md · README · docs |

중간에 요청이 들어와 반영한 것:
- **다크모드**: 정적 `colors` → 라이트/다크 팔레트 + `useColors()` 로 전체 codemod. 설정에서 시스템/라이트/다크
- **번역(ko/en, 확장형)**: ko 를 기준 타입으로, 다른 언어는 같은 키를 다 채워야 컴파일. 서버·shared 가
  한국어 문장을 만들지 않도록 전부 코드화(Issue · APP_ERRORS · systemKey). 지역 이름도 언어별로 저장

## 실프로젝트 배포와 테스트

| 커밋 | 내용 |
|---|---|
| `7be523d` | App Check 강제를 콘솔 등록 전까지 끔 (`functions/.env`) |
| `1383ceb` | 탈퇴한 마지막 사람이 나가면 대화방·메시지·사진 통째 삭제 (실서버 스모크에서 발견) |
| `d541a21` | 실서버 스모크 스크립트 `scripts/smoke-prod.mjs`, 실서버 연결 웹 실행 구성 `web-prod` |
| `075ccf8` | Google 로그인 켠 뒤의 iOS 구성 파일 |
| `91a62f6` | `docs/setup.md` 에 진행 상황·배포 문제 해결법 |
| `a1ba65d` | 로그인 팝업 차단·꺼진 로그인 방법 안내 문구 (실로그인 테스트에서 발견) |
| `7cdb95f` | 탈퇴한 상대를 '탈퇴한 사용자' 로 표시 |
| `683161f` | 다크 지도를 meesae 다크(OpenFreeMap dark 색 조정)로 |
| `b8c0cd5` | 작업 기록 `worklog/` 를 인덱스 방식으로 정리 + 링크 검사기 |
| `8dc7c0e` | Claude 문서 자동 읽기: 루트 CLAUDE.md 길잡이, 폴더별 CLAUDE.md 4개, 문서 링크 검사 훅 |
| `9c60661` · `c2c1ef8` | 웹 Hosting 첫 배포 (https://meesae-app.web.app), `deploy:web` 이 에뮬레이터 모드를 끄고 빌드 |
| `658bf94` | Android 첫 네이티브 빌드(APK)·에뮬레이터 전 흐름 검증, 그때 나온 버그 4개 수정 (`react-native-keyboard-controller` 추가) |
| `4b816b6` | iOS 첫 시뮬레이터 빌드: RNFirebase SPM 끄기(`app.json` 의 `ios.disableSPM`) — `useFrameworks: static` 과 충돌 |
| `7cf9ed5` | iOS 시뮬레이터 전 흐름 검증, 사진 선택 전 권한 요청 제거 |

## 테스트 중 고친 버그

| 버그 | 어디서 | 수정 |
|---|---|---|
| 새로고침·딥링크하면 `/chat` 으로 튕김 (세션 확인 전 가드 판단) | 웹 화면 테스트 | 루트 레이아웃이 세션 확인 전엔 내비게이터를 안 그림 |
| maplibre v6 웹 워커를 Metro 가 못 불러옴 → 지도 빈 화면 | 웹 화면 테스트 | 워커를 `public/maplibre/` 로 복사(postinstall) + `setWorkerUrl` + `prewarm` |
| `functions/.gitignore` 의 `lib/` 가 `functions/src/lib/` 까지 무시 | 첫 커밋 직전 | `/lib/` 로 |
| `secrets: undefined` 로 Functions 로딩 실패 | 첫 통합 테스트 | 있을 때만 넘김 |
| 첫 배포 대량 실패 (Compute Engine API 꺼짐) | 실배포 | API 켜고 재배포 |
| 함수 12개 401 (첫 배포 실패분에 공개 호출 권한 누락) | 실서버 스모크 | Cloud Run `allUsers → run.invoker` 바인딩 |
| 두 사람 다 탈퇴해도 대화·메시지 잔존 | 실서버 스모크 | 마지막 사람 탈퇴 시 삭제 + 테스트 |
| 팝업 차단 시 '문제가 생겼어요' 만 표시 | 실로그인 테스트 | 원인별 안내 |
| 탈퇴한 상대가 '알 수 없음 + ?' | 실로그인 테스트 | '탈퇴한 사용자' + 아이콘 |
| 다크 지도가 너무 어두워 안 보임 | 실로그인 테스트 | 후보 3개(fiord · CARTO · 직접 조정) 비교 후 직접 조정안 채택 |
| 배포한 웹에서 아이콘이 전부 ⊠ (Ionicons 폰트 요청이 index.html 로 떨어짐) | 실서버 웹(모바일) | Hosting `ignore` 의 `**/node_modules/**` 제거 — expo export 가 폰트를 `dist/assets/node_modules/` 에 둔다 |
| Android: 키보드가 채팅 입력줄·글쓰기 시트·프로필 입력칸을 가림 (edge-to-edge 라 `adjustResize` 가 창을 안 줄임) | Android 에뮬레이터 | `src/ui/keyboard(.native).tsx` — 루트 `KeyboardProvider`, `Screen`·게시물 상세는 `KeyboardAwareScrollView`, 채팅·`Sheet` 는 `KeyboardAvoidingView`(padding, automaticOffset). 웹은 그대로 통과 |
| Android: Google '위치 정확도' 창에서 '사용 안함' 이면 위치 인증이 '문제가 생겼어요' | Android 에뮬레이터 | 창 없이 GPS(High)로 재시도 → 최근 위치(10분) → `errors.locationUnavailable` |
| Android: 지도 지역 원을 눌러도 반응 없음 (`ViewAnnotation` 이 자식을 비트맵으로 그려 `Pressable` 무시) | Android 에뮬레이터 | `ViewAnnotation` 의 `onPress` 로 |
| iOS: `pod install` 이 'SPM + static linkage is not supported' 로 실패 | iOS 첫 빌드 | `@react-native-firebase/app` 플러그인에 `ios.disableSPM: true` |
| iOS: 사진 고를 때마다 '사진 보관함 전체 접근' 권한부터 물음 (시스템 선택기는 권한 불필요) | iOS 시뮬레이터 | `pickImage` 의 권한 요청 제거 (Android 13+ 도 같은 효과), `errors.photoPermission` 삭제 |
| React Compiler 린트 14건 (effect 안 동기 setState 등) | 린트 | key 붙인 `useDoc/useQuery/useAsync`, `useNow` 패턴 |

## 사용자와 정한 것

- Firebase 프로젝트 ID `meesae-app`, 번들 ID `com.minsurob.meesae`
- 결제 국가 대한민국(KRW). 결제 계정 생성·카드 입력은 사용자가 직접
- Google 로그인 공개 이름 `Meesae`
- Identity Platform 업그레이드(`beforeSignIn`)는 나중에
- 실서버 자동 테스트용 이메일 로그인은 테스트 동안만 켜고 끈다 (지금 꺼짐)
- 다크 지도 = C안(meesae 다크)
- iOS 는 시뮬레이터 빌드까지만. 실기기 서명은 맥의 회사 팀 인증서를 쓰지 않는다 (2026-10-12)

## UI 일괄 개선

2026-10-12, 브랜치 `ui/airbnb-light`. 계획서 `~/.claude/plans/tender-watching-noodle.md`.

| 커밋 | 내용 |
|---|---|
| b817afc | 토큰(`tokens.ts`)·primitives 분할·전 화면 재배치·Pretendard·다크 스플래시·시안 HTML |
| 4283ead | 다크 팔레트 정리, `/dev/ui` 갤러리, 웹 `<button>` 중첩 제거, 입력 포커스 테두리, 작업 기록 |
| (다음 커밋) | 검증 세션: 대화방 헤더 '알 수 없음' 깜빡임 제거, 06-testing 에 웹·iOS·Android 확인 결과 |

절차: App Store 스크린샷(글램·위피·튤립·윌유)과 다크모드 블로그 분석 → Taste Skill·Vercel Web Interface Guidelines·awesome-design-md 규칙을 읽고
브랜드 4안을 HTML 한 장(`docs/ui-prototypes/light-directions.html`)으로 비교 → Airbnb 안 선택 → `DESIGN.md` 값을 토큰에 옮김.
다크 팔레트 시안은 `dark-variants.html` (A/B/C 는 쓰지 않았고 대비 수식만 테스트로 남김).

### 사용자와 정한 것 (UI)

- 추천 화면은 2열 그리드 + 사진 카드 유지 (글램식 1열 풀블리드 아님)
- 디자인 방향은 Airbnb 안. 다크모드도 같은 언어로 (오프블랙 캔버스, 말풍선은 라이트의 잉크를 뒤집은 밝은 말풍선)
- 글꼴은 Pretendard
- 검증은 다른 세션에서 한다 (이 세션은 웹 라이트·다크 캡처까지) → 그 검증 결과는 [06](06-testing.md#ui-일괄-개선-확인-2026-10-12)
