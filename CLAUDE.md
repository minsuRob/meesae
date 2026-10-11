@AGENTS.md

# 문서 읽는 법

이 파일과 `AGENTS.md` 는 매 세션 자동으로 읽힌다. 나머지 문서는 **필요할 때 필요한 섹션만** 읽는다.

1. 작업을 받으면 [worklog/README.md](worklog/README.md) 의 **"이럴 땐 여기"** 표에서 해당 줄 하나만 따라간다
2. 파일을 통째로 읽지 않는다. 각 파일 맨 위 목차 → 해당 섹션만 (`grep -n '^## ' 파일` 로 줄 번호를 보고 Read 의 offset/limit)
3. 폴더별 `CLAUDE.md` 가 그 폴더 파일을 열 때 자동으로 붙는다 — `functions/` · `shared/` · `src/i18n/` · `src/ui/`

| 작업 | 먼저 볼 곳 |
|---|---|
| 화면·기능 수정 | [02 구조 › 앱 쪽 주요 모듈](worklog/02-architecture.md#앱-쪽-주요-모듈) |
| 서버 함수 추가·수정 | [08 › 새 서버 함수 추가](worklog/08-runbook.md#새-서버-함수-추가) |
| Rules·데이터 권한 | [03 › Firestore 컬렉션](worklog/03-data-security.md#firestore-컬렉션) → `firestore.rules` · `storage.rules` |
| 문구·번역 | [08 › 새 언어 추가](worklog/08-runbook.md#새-언어-추가) · `src/i18n/locales/ko.ts` |
| 배포·실서버 | [05 인프라](worklog/05-infrastructure.md) → [08 › 배포](worklog/08-runbook.md#배포) |
| 버그 조사 | [04 › 테스트 중 고친 버그](worklog/04-history.md#테스트-중-고친-버그) (같은 증상이 있었는지) |
| 다음 할 일 | [07 › P0 출시 차단](worklog/07-todo.md#p0-출시-차단) |

# 작업이 끝나면

바뀐 것만 해당 worklog 섹션에 반영한다 (새 파일보다 기존 섹션 갱신이 먼저).

- 커밋 → `04-history.md` · 실서버 변경 → `05-infrastructure.md` · 테스트 결과 → `06-testing.md`
- 할 일 완료·추가 → `07-todo.md` · 새 절차·문제 해결 → `08-runbook.md`
- `worklog/README.md` 의 상태 요약과 "마지막 갱신" 커밋
- worklog·CLAUDE.md 를 고치면 훅이 링크를 검사한다 (`python3 worklog/check-links.py`). 깨지면 고치고 넘어간다
- 저장소가 공개다. 실제 계정 ID·이메일·결제 계정 ID·비밀값을 문서에 쓰지 않는다
