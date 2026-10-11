# src/i18n/ — 번역

이 폴더 파일을 열 때 자동으로 붙는다. 언어 추가 절차는 [08 › 새 언어 추가](../../worklog/08-runbook.md#새-언어-추가).

- `locales/ko.ts` 가 기준. 다른 언어는 `Catalog` 타입이라 키가 하나라도 다르면 tsc 가 잡는다
- 화면에서는 `const { t } = useT()`, 컴포넌트 밖(알림창·오류)에서는 `translate()`
- 한국어: 부드러운 해요체, 조사는 `josa()` (`이(가)` 금지). 영어: 짧고 캐주얼, 복수형은 함수 메시지로
- 서버 오류는 `errors.<CODE>`, 검증은 `validation.<code>` + `fields.<field>` — 서버가 문장을 보내지 않는다
- 확인: `npm test` (`__tests__/catalog.test.ts` 가 언어별 키·함수 메시지를 검사)
