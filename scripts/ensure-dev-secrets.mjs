/**
 * 에뮬레이터용 비밀값 파일(functions/.secret.local)이 없으면 개발용 더미로 만든다.
 * 운영 값은 Secret Manager 에만 둔다: firebase functions:secrets:set PHONE_HASH_PEPPER
 */

import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const file = join(dirname(fileURLToPath(import.meta.url)), '../functions/.secret.local');
if (!existsSync(file)) {
  writeFileSync(file, '# 에뮬레이터 전용 개발용 더미 (커밋하지 않는다)\nPHONE_HASH_PEPPER=dev-only-pepper\n');
  console.log('created functions/.secret.local (dev dummy)');
}
