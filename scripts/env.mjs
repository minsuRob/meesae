/**
 * 로컬 .env 를 GCP Secret Manager 와 맞춘다. 어느 PC 든 `gcloud auth login` 한 번이면 된다.
 *
 *   npm run env:pull            Secret Manager 최신 → .env (로컬과 다르면 --force 필요, 기존 파일은 .env.bak)
 *   npm run env:push            .env → 새 버전. 원격에만 있는 키를 지우게 되면 --force 필요
 *   npm run env:diff            키 단위 차이만 보여 준다 (값은 출력하지 않는다)
 *
 * 프로젝트는 .firebaserc 의 default 를 쓴다 (gcloud 기본 프로젝트와 무관).
 * 무료 범위(활성 버전 6개) 안에 머물도록 push 할 때 최근 KEEP 개만 남기고 나머지 버전은 파기한다.
 * 기기마다 다른 값(EXPO_PUBLIC_USE_EMULATOR · EXPO_PUBLIC_EMULATOR_HOST 등)은 .env.local 에 둔다.
 */

import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = [{ path: '.env', secret: 'dotenv' }];
const KEEP = 2;

const PROJECT = JSON.parse(readFileSync(join(ROOT, '.firebaserc'), 'utf8')).projects.default;
const [cmd, ...flags] = process.argv.slice(2);
const force = flags.includes('--force');

function gcloud(args, input) {
  try {
    return execFileSync('gcloud', [...args, `--project=${PROJECT}`], {
      encoding: 'utf8',
      input,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (e) {
    const err = new Error(String(e.stderr || e.message).trim());
    err.notFound = /NOT_FOUND|not found/i.test(err.message);
    throw err;
  }
}

function remote(secret) {
  try {
    return gcloud(['secrets', 'versions', 'access', 'latest', `--secret=${secret}`]);
  } catch (e) {
    if (e.notFound) return null;
    throw e;
  }
}

function parse(text) {
  const map = new Map();
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (m) map.set(m[1], m[2].trim());
  }
  return map;
}

/** from → to 로 바뀌는 키 이름만 */
function diff(fromText, toText) {
  const a = parse(fromText);
  const b = parse(toText);
  return {
    added: [...b.keys()].filter((k) => !a.has(k)),
    removed: [...a.keys()].filter((k) => !b.has(k)),
    changed: [...b.keys()].filter((k) => a.has(k) && a.get(k) !== b.get(k)),
  };
}

function printDiff(label, d) {
  const lines = [
    ...d.added.map((k) => `  + ${k}`),
    ...d.removed.map((k) => `  - ${k}`),
    ...d.changed.map((k) => `  ~ ${k}`),
  ];
  console.log(`${label}${lines.length ? '' : ' (키·값은 같고 주석·순서만 다름)'}`);
  for (const l of lines) console.log(l);
}

function pruneVersions(secret) {
  const names = gcloud([
    'secrets', 'versions', 'list', secret,
    '--filter=state!=DESTROYED', '--sort-by=~createTime', '--format=value(name)',
  ]).split('\n').filter(Boolean).map((n) => n.split('/').pop());
  for (const v of names.slice(KEEP)) {
    gcloud(['secrets', 'versions', 'destroy', v, `--secret=${secret}`, '--quiet']);
  }
  return Math.max(0, names.length - KEEP);
}

function pull({ path, secret }) {
  const file = join(ROOT, path);
  const text = remote(secret);
  if (text === null) {
    console.log(`${path}: Secret Manager 에 '${secret}' 이 없어요. 먼저 env:push`);
    return 1;
  }
  const local = existsSync(file) ? readFileSync(file, 'utf8') : null;
  if (local === text) {
    console.log(`${path}: 이미 최신`);
    return 0;
  }
  if (local !== null && !force) {
    printDiff(`${path}: pull 하면 바뀌는 키`, diff(local, text));
    console.log('덮어쓰려면 --force (기존 파일은 .env.bak 으로 남겨요)');
    return 1;
  }
  if (local !== null) copyFileSync(file, `${file}.bak`);
  writeFileSync(file, text, { mode: 0o600 });
  console.log(`${path}: 받았어요 (${parse(text).size}개 키)`);
  return 0;
}

function push({ path, secret }) {
  const file = join(ROOT, path);
  if (!existsSync(file)) {
    console.log(`${path}: 파일이 없어요`);
    return 1;
  }
  const local = readFileSync(file, 'utf8');
  const text = remote(secret);
  if (text === local) {
    console.log(`${path}: 원격과 같아요`);
    return 0;
  }
  if (text === null) {
    gcloud(['secrets', 'create', secret, '--replication-policy=automatic']);
  } else {
    const d = diff(text, local);
    printDiff(`${path}: push 하면 바뀌는 키`, d);
    if (d.removed.length && !force) {
      console.log('원격에만 있는 키가 지워져요. 오래된 파일이 아니라면 --force');
      return 1;
    }
  }
  gcloud(['secrets', 'versions', 'add', secret, '--data-file=-'], local);
  const pruned = pruneVersions(secret);
  console.log(`${path}: 올렸어요${pruned ? ` (오래된 버전 ${pruned}개 파기)` : ''}`);
  return 0;
}

function showDiff({ path, secret }) {
  const file = join(ROOT, path);
  const text = remote(secret);
  const local = existsSync(file) ? readFileSync(file, 'utf8') : null;
  if (text === null || local === null) {
    console.log(`${path}: ${text === null ? '원격' : '로컬'} 없음`);
  } else if (text === local) {
    console.log(`${path}: 같아요`);
  } else {
    printDiff(`${path}: pull 하면 바뀌는 키`, diff(local, text));
  }
  return 0;
}

const run = { pull, push, diff: showDiff }[cmd];
if (!run) {
  console.log('사용법: node scripts/env.mjs <pull|push|diff> [--force]');
  process.exit(1);
}

try {
  let code = 0;
  for (const f of FILES) code = run(f) || code;
  process.exit(code);
} catch (e) {
  if (/auth|credential|login/i.test(e.message)) {
    console.error(`gcloud 로그인이 필요해요: gcloud auth login\n${e.message}`);
  } else if (/ENOENT/.test(e.message)) {
    console.error('gcloud 가 없어요: https://cloud.google.com/sdk/docs/install');
  } else {
    console.error(e.message);
  }
  process.exit(1);
}
