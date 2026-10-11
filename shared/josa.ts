/**
 * 받침에 맞는 조사. `이(가)` 같은 표기를 남기지 않기 위해 쓴다.
 */

type Pair = '을/를' | '은/는' | '이/가' | '과/와' | '으로/로';

function hasBatchim(word: string): boolean {
  const last = word.trim().slice(-1);
  if (!last) return false;
  const code = last.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
  // 숫자·영문은 읽는 소리로 근사한다
  return /[013678LMNRlmnr]$/.test(last);
}

function isRieulBatchim(word: string): boolean {
  const code = word.trim().slice(-1).charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 === 8;
}

/** josa('닉네임', '을/를') → '닉네임을' */
export function josa(word: string, pair: Pair): string {
  const [withB, withoutB] = pair.split('/') as [string, string];
  if (pair === '으로/로') {
    return word + (hasBatchim(word) && !isRieulBatchim(word) ? withB : withoutB);
  }
  return word + (hasBatchim(word) ? withB : withoutB);
}
