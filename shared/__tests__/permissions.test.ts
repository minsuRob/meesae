import { describe, expect, it } from 'vitest';

import { can, missingFor, pickClaims } from '../permissions';

describe('permissions', () => {
  const social = { onboarded: true };
  const phone = { onboarded: true, phoneVerified: true };

  it('소셜 로그인만으로 탐색·좋아요·텍스트 채팅·게시물·지도', () => {
    for (const a of ['discover.view', 'like.send', 'chat.sendText', 'post.create', 'map.view'] as const) {
      expect(can(social, a)).toBe(true);
    }
  });

  it('사진 전송·위치공유·인증 배지는 휴대폰 인증 필요', () => {
    for (const a of ['chat.sendImage', 'location.liveShare', 'badge.verified'] as const) {
      expect(can(social, a)).toBe(false);
      expect(missingFor(social, a)).toBe('phoneVerified');
      expect(can(phone, a)).toBe(true);
    }
  });

  it('온보딩 전에는 아무것도 못 하고, 정지 계정은 전부 막힌다', () => {
    expect(can({}, 'discover.view')).toBe(false);
    expect(missingFor({}, 'discover.view')).toBe('onboarded');
    expect(can({ ...phone, banned: true }, 'chat.sendText')).toBe(false);
    expect(missingFor({ ...phone, banned: true }, 'chat.sendText')).toBe('banned');
    expect(missingFor(null, 'chat.sendText')).toBe('signedOut');
  });

  it('관리자 권한은 role 로만', () => {
    expect(can(phone, 'admin')).toBe(false);
    expect(can({ role: 'admin' }, 'admin')).toBe(true);
  });

  it('토큰에서 알려진 클레임만 꺼낸다', () => {
    expect(pickClaims({ onboarded: true, phoneVerified: 'yes', role: 'root', iss: 'x' })).toEqual({ onboarded: true });
  });
});
