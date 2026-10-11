import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 경계 규칙: shared/ 는 앱과 Functions 가 같이 쓰는 순수 TypeScript 다.
 * UI·네트워크 라이브러리를 import 하면 Functions 번들이 깨지거나 앱 번들이 커진다.
 */

const ROOT = join(process.cwd(), 'shared');
const FORBIDDEN = [
  'react',
  'react-native',
  'react-dom',
  'expo',
  'expo-router',
  'zustand',
  'firebase',
  'firebase-admin',
  'firebase-functions',
  '@react-native-firebase',
  '@react-native-async-storage',
];

function walk(dir: string): string[] {
  let out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out = out.concat(walk(full));
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

function importsOf(source: string): string[] {
  const out: string[] = [];
  const re = /(?:import|export)[^'"]*?from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) out.push((m[1] ?? m[2] ?? m[3])!);
  return out;
}

const files = walk(ROOT).filter((f) => !f.includes('__tests__'));

describe('shared 경계', () => {
  it('검사할 파일이 있다', () => {
    expect(files.length).toBeGreaterThan(8);
  });

  it('UI·Firebase 라이브러리를 import 하지 않는다', () => {
    const offenders: string[] = [];
    for (const file of files) {
      for (const imp of importsOf(readFileSync(file, 'utf8'))) {
        if (FORBIDDEN.some((f) => imp === f || imp.startsWith(`${f}/`) || imp.startsWith(`${f}-`))) {
          offenders.push(`${file.replace(process.cwd(), '')} → ${imp}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('상대 경로로 shared 안의 파일만 import 한다 (별칭·외부 패키지 금지)', () => {
    const offenders: string[] = [];
    for (const file of files) {
      for (const imp of importsOf(readFileSync(file, 'utf8'))) {
        if (!imp.startsWith('./')) offenders.push(`${file.replace(process.cwd(), '')} → ${imp}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('src/ 는 shared 를 별칭(@shared)으로만 가져온다', () => {
    const src = walk(join(process.cwd(), 'src')).concat(walk(join(process.cwd(), 'app')));
    const offenders = src.filter((f) => importsOf(readFileSync(f, 'utf8')).some((i) => /(^|\/)\.\.\/.*shared\//.test(i)));
    expect(offenders).toEqual([]);
  });
});
