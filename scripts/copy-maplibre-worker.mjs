/**
 * maplibre-gl v6 는 웹 워커를 별도 모듈 파일로 불러온다. Metro 번들 안에서는 그 경로를 못 찾으므로
 * public/ 에 복사해 같은 출처에서 서빙하고, MapView.tsx 가 setWorkerUrl 로 가리킨다.
 * npm install 때 postinstall 로 돈다 (복사본은 .gitignore).
 */

import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs');
const outDir = join(root, 'public/maplibre');
mkdirSync(outDir, { recursive: true });
copyFileSync(src, join(outDir, 'maplibre-gl-worker.mjs'));
console.log('maplibre worker → public/maplibre/maplibre-gl-worker.mjs');
