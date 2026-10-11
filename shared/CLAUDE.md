# shared/ — 앱·Functions 공용 순수 TypeScript

이 폴더 파일을 열 때 자동으로 붙는다. 원칙 전체는 [02 › 설계 원칙](../worklog/02-architecture.md#설계-원칙).

- react · react-native · expo · zustand · firebase · firebase-admin 을 import 하지 않는다. `./x` 상대 경로만
- 문장을 만들지 않는다: 검증 실패 `Issue {field, code, limit}`, 서버 오류 `APP_ERRORS` 코드, 시스템 메시지 `systemKey`
- `permissions.ts` 를 바꾸면 `firestore.rules` · `storage.rules` 도 같은 뜻으로 고친다
- 새 오류 코드·선택지·국가·상점 아이템을 넣으면 앱 카탈로그(`src/i18n/locales/*.ts`)에도 넣는다 — 카탈로그 테스트가 잡는다
- 확인: `npm test` (경계 테스트 `__tests__/boundary.test.ts` 포함)
