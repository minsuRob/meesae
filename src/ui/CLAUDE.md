# src/ui/ — 테마·기본 컴포넌트

이 폴더 파일을 열 때 자동으로 붙는다.

- 색은 컴포넌트 안에서 `const colors = useColors()`. 정적 import 하면 다크모드가 안 바뀐다
- 토큰(`theme.ts`)과 `primitives/` 만 고치면 디자인이 바뀌게 유지한다. 화면 코드에 색·간격 숫자를 쓰지 않는다
- 레이아웃 분기는 `layout/useLayoutMode()` 하나 (폭 ≥ 768 = desktop)
- 웹의 알림·확인 창은 `notify.ts` (react-native-web 의 Alert 는 동작하지 않음)
- effect 안에서 setState 를 동기로 부르지 않는다 (React Compiler 린트) — 시간은 `useNow()`
