# functions/ — Cloud Functions (asia-northeast3)

이 폴더 파일을 열 때 자동으로 붙는다. 자세한 절차는 [08 › 새 서버 함수 추가](../worklog/08-runbook.md#새-서버-함수-추가).

- callable 은 `src/lib/guard.ts` 의 `callable(이름, { action, rate }, handler)` 로만 만든다 (로그인·App Check·정지·권한·레이트리밋)
- 계약(요청·응답 타입)은 `../shared/api.ts` 의 `Api`. export 이름 = 함수 이름 (`src/index.ts`)
- 포인트 증감은 `src/lib/ledger.ts` 의 `runWalletTx` 만. 트랜잭션 안에서 읽기를 다 끝낸 뒤 쓴다
- 오류는 `appError('CODE')`, 검증 실패는 `invalid(issue)`. **사용자 문장을 만들지 않는다** (앱이 번역)
- `../shared` 는 상대 경로로 import, esbuild 가 번들에 넣는다 (`npm run build`)
- 확인: `npm --prefix functions run typecheck` → 루트에서 `npm run test:functions`
- 배포 후 401 이면 [08 › callable 이 401](../worklog/08-runbook.md#callable-이-401)
