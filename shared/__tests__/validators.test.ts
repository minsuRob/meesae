import { describe, expect, it } from 'vitest';

import { toE164 } from '../countries';
import { josa } from '../josa';
import { ageFrom, isOwnProfilePhotoPath, validateDraft, validateFields } from '../onboarding-schema';
import { sanitizeFilters, passesFilters } from '../score';
import { checkMessage, checkNickname, cleanText, containsContact, isRequestId } from '../validators';
import type { UserPublic } from '../models';

const NOW = Date.UTC(2026, 9, 11);

describe('validators', () => {
  it('닉네임: 문장 대신 필드·코드로 실패를 알린다', () => {
    expect(checkNickname('민수').ok).toBe(true);
    expect(checkNickname('a')).toEqual({ ok: false, issue: { field: 'nickname', code: 'tooShort', limit: 2 } });
    expect(checkNickname('공백 있음')).toMatchObject({ ok: false });
    expect(checkNickname('01012345678')).toMatchObject({ ok: false });
  });

  it('조사가 받침에 맞는다', () => {
    expect(josa('닉네임', '을/를')).toBe('닉네임을');
    expect(josa('메시지', '을/를')).toBe('메시지를');
    expect(josa('민수', '과/와')).toBe('민수와');
    expect(josa('상대', '과/와')).toBe('상대와');
    expect(checkMessage('')).toEqual({ ok: false, issue: { field: 'message', code: 'required' } });
  });

  it('텍스트 정리·연락처 감지', () => {
    expect(cleanText('  a\n\n\n\nb\u0007 ')).toBe('a\n\nb');
    expect(containsContact('카톡 아이디: abcd12')).toBe(true);
    expect(containsContact('010-1234-5678')).toBe(true);
    expect(containsContact('https://x.y')).toBe(true);
    expect(containsContact('오늘 3시에 만나요')).toBe(false);
    expect(containsContact('online game 좋아해요')).toBe(false);
  });

  it('멱등키 형식', () => {
    expect(isRequestId('abcdef0123456789')).toBe(true);
    expect(isRequestId('short')).toBe(false);
    expect(isRequestId('../../etc')).toBe(false);
  });

  it('전화번호 E.164', () => {
    expect(toE164('010-1234-5678', 'KR')).toBe('+821012345678');
    expect(toE164('+1 650 555 1234', 'KR')).toBe('+16505551234');
    expect(toE164('abc', 'KR')).toBeNull();
  });
});

describe('onboarding schema', () => {
  const uid = 'u1';
  const draft = {
    nickname: '민수',
    birthDate: '1995-04-12',
    gender: 'male' as const,
    photos: ['users/u1/profile/a.jpg'],
    countryCode: 'kr',
  };

  it('만 나이', () => {
    expect(ageFrom('1995-04-12', NOW)).toBe(31);
    expect(ageFrom('2008-10-12', NOW)).toBe(17);
    expect(ageFrom('2008-10-11', NOW)).toBe(18);
    expect(ageFrom('1995-02-30', NOW)).toBeNull();
  });

  it('필수 항목이 다 있으면 통과하고 국가 코드를 대문자로', () => {
    const r = validateDraft(draft, { uid, nowMs: NOW });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.countryCode).toBe('KR');
  });

  it('미성년자·남의 사진 경로·잘못된 선택지는 거부', () => {
    expect(validateFields({ ...draft, birthDate: '2010-01-01' }, ['birthDate'], { uid, nowMs: NOW }).birthDate).toEqual({
      field: 'birthDate',
      code: 'underage',
      limit: 18,
    });
    expect(validateFields({ ...draft, photos: ['users/other/profile/a.jpg'] }, ['photos'], { uid, nowMs: NOW }).photos).toBeTruthy();
    expect(isOwnProfilePhotoPath(uid, 'users/u1/profile/../../x')).toBe(false);
    expect(validateDraft({ ...draft, mbti: 'XXXX' as never }, { uid, nowMs: NOW }).ok).toBe(false);
  });
});

describe('score filters', () => {
  const p = { age: 30, gender: 'female', mbti: 'ENFP', drinking: 'never', smoking: 'never' } as UserPublic;

  it('나이·성별·추가 필터', () => {
    expect(passesFilters(p, { ageMin: 20, ageMax: 35, genders: ['female'] }, false)).toBe(true);
    expect(passesFilters(p, { ageMax: 29 }, false)).toBe(false);
    expect(passesFilters(p, { mbti: ['INTJ'] }, false)).toBe(true); // 추가 필터 권한 없으면 무시
    expect(passesFilters(p, { mbti: ['INTJ'] }, true)).toBe(false);
  });

  it('필터 정리', () => {
    expect(sanitizeFilters({ ageMin: 50, ageMax: 10, scope: 'galaxy', genders: ['male', 1] })).toEqual({
      ageMin: 18,
      ageMax: 50,
      genders: ['male'],
    });
  });
});
