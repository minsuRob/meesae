# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.
SDK 56 이하의 기억으로 API 를 쓰면 조용히 틀린다. 네이티브 모듈을 넣을 때는 `npx expo install` 로.

---

# 이 저장소의 규칙

meesae — Firebase + Expo(웹·iOS·Android) 데이팅 앱. 구조와 결정 배경은 `docs/decisions.md`.

## 경계

`shared/` 는 앱과 Functions 가 같이 쓰는 **순수 TypeScript** 다.

- react · react-native · expo · zustand · firebase · firebase-admin 을 import 하지 않는다
- `shared/` 안에서는 상대 경로(`./x`)만 쓴다. 앱은 `@shared/*` 별칭으로 가져온다
- **문장을 만들지 않는다.** 검증 실패는 `Issue {field, code, limit}`, 서버 오류는 `APP_ERRORS` 코드,
  시스템 메시지는 `systemKey` 로 보낸다. 사용자 문구는 앱 번역 카탈로그가 고른다

`shared/__tests__/boundary.test.ts` 가 이 규칙을 강제한다.

## 보안

- 민감한 쓰기(프로필 공개 문서·메시지·좋아요·포인트·신고·차단)는 **전부 Functions**. 클라이언트가 직접 쓸 수 있는 곳은
  `users_private/{uid}` 의 `filters · fcmTokens · settings` 뿐이다
- 권한은 `shared/permissions.ts` 의 `can()` 하나. Functions(`lib/guard.ts`)와 앱 UI 가 같이 쓰고,
  `firestore.rules` · `storage.rules` 는 같은 조건을 손으로 옮겨 적는다. 한쪽을 바꾸면 다른 쪽도 본다
- 개인 좌표는 `users_private` 에만. 밖으로 나가는 것은 구 단위 라벨, 거리 버킷, geohash 5자리 격자 중심뿐
- 포인트 증감은 `functions/src/lib/ledger.ts` 의 `runWalletTx` 만. 금액은 `shared/economy.ts` 한 곳

## 번역 (ko · en)

- 문구는 `src/i18n/locales/ko.ts`(기준) · `en.ts`. 화면에서는 `const { t } = useT()`, 컴포넌트 밖에서는 `translate()`
- 한국어는 부드러운 해요체, 조사는 `josa()` 로 받침에 맞춘다 (`이(가)` 금지). 영어는 짧고 캐주얼하게, 복수형은 함수로
- 새 언어: `shared/i18n.ts` 의 `LOCALES` 추가 → `locales/<code>.ts` 를 `Catalog` 타입으로 작성 → `src/i18n/index.ts` 에 등록.
  빠진 키는 tsc 와 `src/i18n/__tests__/catalog.test.ts` 가 잡는다. 서버는 새 언어의 지역 이름도 자동으로 받아 둔다
- 지역 이름은 `regionLabels[locale] ?? regionLabel` (`regionName()`), regionKey 는 언어와 무관

## 화면

- 색·간격은 `src/ui/theme.ts` 토큰만. 색은 컴포넌트 안에서 `const colors = useColors()` (정적 import 금지 → 다크모드가 안 바뀐다)
- 기본 컴포넌트는 `src/ui/primitives`. 디자인 교체 시 이 두 곳만 고친다
- 레이아웃 분기는 `useLayoutMode()` 하나 (폭 ≥ 768 = desktop: 사이드바 + `SplitPane`)
- effect 안에서 setState 를 동기로 부르지 않는다 (React Compiler 린트). 구독 결과에 key 를 붙이는 `useDoc/useQuery/useAsync` 패턴을 쓴다

## 확인

```bash
npm test && npm run typecheck && npm run lint
npm run test:rules        # Firestore/Storage Rules (에뮬레이터)
npm run test:functions    # Functions 통합 (무료 횟수·포인트·멱등키·권한)
```

로컬 실행: `npm run emulators` → `npm run seed` → `npm run web`. 자세한 것은 README.
