// Functions 번들. ../shared 를 상대 경로로 import 하므로 tsc 대신 esbuild 로 한 파일에 묶는다.
// node_modules 패키지(firebase-admin, sharp 등)는 번들에 넣지 않고 배포 시 설치되게 둔다.
import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  outfile: 'lib/index.js',
  sourcemap: true,
  packages: 'external',
  logLevel: 'info',
});
