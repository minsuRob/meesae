# src/ui/ — 테마·기본 컴포넌트

이 폴더 파일을 열 때 자동으로 붙는다.

- 값은 `tokens.ts`(순수 TS, react-native import 금지 — vitest 가 읽는다), 훅은 `theme.ts`. 색은 컴포넌트 안에서 `const colors = useColors()`. 정적 import 하면 다크모드가 안 바뀐다
- 디자인 언어는 Airbnb (`docs/decisions.md`). 액센트는 `primary` 한 색만(CTA·좋아요·활성 탭), 모서리는 카드 `radius.lg` / 버튼·입력 `radius.sm` / 알약, 그림자는 `useElevation()[1]` 한 단계. 두 번째 강조색·그라데이션·장식 라벨을 넣지 않는다
- 누르는 것은 전부 `Press`(눌림 스케일·햅틱) 위에 만든다. **`Press` 안에 `Press`/`Button`/`IconButton` 을 넣지 않는다** (웹에서 `<button>` 중첩 오류). 겹쳐야 하면 형제로 absolute 배치
- 새 글자색 단계는 `Text tone`(strong/default/body/muted/faint), 크기는 `variant`(display…badge). 화면 코드에 색·간격 숫자를 쓰지 않는다
- 토큰을 바꾸면 `src/ui/__tests__/contrast.test.ts`(본문 4.5:1, UI 3:1)가 걸러 준다. 개발용 갤러리 `/dev/ui` 로 라이트·다크를 나란히 본다
- 레이아웃 분기는 `layout/useLayoutMode()` 하나 (폭 ≥ 768 = desktop)
- 웹의 알림·확인 창은 `notify.ts`, 잠깐 뜨는 알림은 `toast()`
- effect 안에서 setState 를 동기로 부르지 않는다 (React Compiler 린트) — 시간은 `useNow()`. Reanimated 공유값은 `.get()/.set()` 만
