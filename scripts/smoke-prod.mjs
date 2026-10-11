/**
 * 실제 프로젝트(meesae-app) 대상 스모크 테스트. 테스트 계정 2개로 주요 API 를 한 바퀴 돌고 탈퇴로 정리한다.
 *
 *   node scripts/smoke-prod.mjs --yes
 *
 * 전제: 콘솔에서 이메일/비밀번호 로그인을 "테스트 동안만" 켜 둔다 (끝나면 끈다).
 *       functions/.env 의 ENFORCE_APP_CHECK=false (App Check 등록 전).
 * 실제 지오코딩(Nominatim)·Storage 트리거·Firestore Rules 를 그대로 탄다.
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { deleteApp, initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getMetadata, getStorage, ref, uploadBytes } from 'firebase/storage';

if (!process.argv.includes('--yes')) {
  console.error('실제 프로젝트에 계정을 만들고 지운다. 확인했으면 --yes 를 붙여 다시 실행.');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  readFileSync(join(root, '.env'), 'utf8')
    .split('\n')
    .filter((l) => /^EXPO_PUBLIC_FIREBASE_/.test(l))
    .map((l) => l.split('=').map((s) => s.trim())),
);
const config = {
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
const sharp = createRequire(import.meta.url)(join(root, 'functions/node_modules/sharp'));

let pass = 0;
let fail = 0;
const results = [];
async function step(name, fn) {
  const t = Date.now();
  try {
    const note = await fn();
    pass++;
    results.push(`✓ ${name}${note ? ` — ${note}` : ''} (${Date.now() - t}ms)`);
  } catch (e) {
    fail++;
    results.push(`✗ ${name} — ${e?.details?.code ?? e?.code ?? ''} ${e?.message ?? e}`);
  }
  console.log(results[results.length - 1]);
}
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
async function expectCode(p, code) {
  try {
    await p;
  } catch (e) {
    const got = e?.details?.code ?? e?.code;
    if (got === code || String(got).endsWith(code)) return code;
    throw new Error(`expected ${code}, got ${got}`);
  }
  throw new Error(`expected ${code}, but succeeded`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rid = () => `smoke${Date.now()}${Math.floor(Math.random() * 1e6)}`;

const stamp = Date.now();
const password = `Smoke-${stamp}-${Math.random().toString(36).slice(2)}`;

function client(name) {
  const app = initializeApp(config, `${name}-${stamp}`);
  const auth = getAuth(app);
  const fns = getFunctions(app, 'asia-northeast3');
  return {
    name,
    app,
    auth,
    db: getFirestore(app),
    storage: getStorage(app),
    email: `smoke-${name}-${stamp}@meesae.test`,
    get uid() {
      return auth.currentUser?.uid;
    },
    call: async (fn, data) => (await httpsCallable(fns, fn, { timeout: 120_000 })(data)).data,
  };
}

const A = client('a');
const B = client('b');
const ctx = {};

async function onboard(u, coords) {
  await createUserWithEmailAndPassword(u.auth, u.email, password);
  // onAuthCreate 가 지갑을 만들 때까지
  for (let i = 0; i < 20; i++) {
    const w = await getDoc(doc(u.db, 'wallets', u.uid)).catch(() => null);
    if (w?.exists()) break;
    await sleep(1500);
  }
  const jpg = await sharp({ create: { width: 1200, height: 1500, channels: 3, background: { r: 120, g: 80, b: 200 } } })
    .jpeg()
    .toBuffer();
  const path = `users/${u.uid}/profile/smoke.jpg`;
  await uploadBytes(ref(u.storage, path), new Uint8Array(jpg), { contentType: 'image/jpeg' });
  const loc = await u.call('updateLocation', { ...coords, accuracy: 30 });
  await u.call('completeOnboarding', {
    draft: { nickname: `smoke${u.name}${String(stamp).slice(-4)}`, birthDate: '1995-04-12', gender: u.name === 'a' ? 'female' : 'male', photos: [path], countryCode: 'KR' },
  });
  const token = await u.auth.currentUser.getIdTokenResult(true);
  return { loc, claims: token.claims, path, uid: u.uid };
}

try {
  await step('가입·위치 인증(실제 지오코딩)·온보딩 A', async () => {
    ctx.a = await onboard(A, { lat: 37.5894, lng: 127.0167 });
    expect(ctx.a.claims.onboarded === true, 'onboarded 클레임 없음');
    return `${ctx.a.loc.regionLabels.ko} / ${ctx.a.loc.regionLabels.en} · +${ctx.a.loc.rewarded}P`;
  });
  await step('가입·온보딩 B', async () => {
    ctx.b = await onboard(B, { lat: 37.4979, lng: 127.0276 });
    expect(ctx.b.claims.onboarded === true, 'onboarded 클레임 없음');
    return `${ctx.b.loc.regionLabels.ko} / ${ctx.b.loc.regionLabels.en}`;
  });

  await step('사진 업로드 트리거가 EXIF 제거·리사이즈', async () => {
    for (let i = 0; i < 15; i++) {
      const m = await getMetadata(ref(A.storage, ctx.a.path));
      if (m.customMetadata?.processed === 'true') return `${m.size} bytes`;
      await sleep(2000);
    }
    throw new Error('processed 표시가 안 붙음');
  });

  await step('추천 목록에 상대가 거리 버킷과 함께 나온다', async () => {
    const r = await A.call('getRecommendations', { filters: { scope: 'country', ageMin: 18, ageMax: 99 } });
    const b = r.items.find((p) => p.uid === B.uid);
    expect(b, 'B 가 추천에 없음');
    expect(!JSON.stringify(r).includes('37.4979'), '좌표가 노출됨');
    return `${r.items.length}명, B=${b.distance}`;
  });

  await step('프로필 조회', async () => {
    const r = await A.call('getProfile', { uid: B.uid });
    return r.profile.nickname;
  });

  await step('서로 좋아요 → 매치 + 대화방', async () => {
    const a = await A.call('likeUser', { targetUid: B.uid, clientRequestId: rid() });
    expect(a.free && !a.matched, '첫 좋아요가 무료가 아니거나 바로 매치됨');
    const b = await B.call('likeUser', { targetUid: A.uid, clientRequestId: rid() });
    expect(b.matched && b.conversationId, '매치 안 됨');
    ctx.conv = b.conversationId;
    return ctx.conv;
  });

  await step('메시지 전송 → 상대가 실시간 문서로 읽음 (시스템 메시지는 키)', async () => {
    await A.call('sendMessage', { conversationId: ctx.conv, text: '안녕하세요! 스모크 테스트예요', clientRequestId: rid() });
    const snap = await getDocs(query(collection(B.db, 'conversations', ctx.conv, 'messages'), orderBy('createdAt')));
    const msgs = snap.docs.map((d) => d.data());
    expect(msgs.some((m) => m.systemKey === 'matched'), '매치 시스템 메시지 없음');
    expect(msgs.some((m) => m.text.includes('스모크')), '보낸 메시지 없음');
    return `${msgs.length}건`;
  });

  await step('사진 메시지는 휴대폰 인증 필요', () =>
    expectCode(A.call('finalizeChatImage', { conversationId: ctx.conv, path: `chat/${ctx.conv}/${A.uid}/x.jpg`, clientRequestId: rid() }), 'PHONE_REQUIRED'),
  );

  await step('Rules: 남의 비공개 문서·지갑 쓰기·메시지 위조 거부', async () => {
    await expectCode(getDoc(doc(A.db, 'users_private', B.uid)), 'permission-denied');
    await expectCode(setDoc(doc(A.db, 'wallets', A.uid), { balance: 999999 }, { merge: true }), 'permission-denied');
    await expectCode(
      addDoc(collection(A.db, 'conversations', ctx.conv, 'messages'), { senderUid: B.uid, text: '위조', type: 'text', createdAt: Date.now() }),
      'permission-denied',
    );
    await expectCode(getDocs(collection(A.db, 'users_public')), 'permission-denied');
    return '4/4 거부';
  });

  await step('피드: 글쓰기 → 좋아요·댓글 → 목록', async () => {
    const { postId } = await A.call('createPost', { text: '스모크 테스트 게시물이에요', clientRequestId: rid() });
    ctx.post = postId;
    const l = await B.call('likePost', { postId });
    await B.call('commentPost', { postId, text: '좋아요!', clientRequestId: rid() });
    const feed = await getDocs(query(collection(B.db, 'posts'), where('status', '==', 'visible'), where('countryCode', '==', 'KR'), orderBy('createdAt', 'desc')));
    expect(feed.docs.some((d) => d.id === postId), '피드에 없음');
    return `likeCount=${l.likeCount}`;
  });

  await step('연락처가 든 게시물은 거부 (이슈 코드)', async () => {
    try {
      await A.call('createPost', { text: '카톡 아이디: abcd1234', clientRequestId: rid() });
    } catch (e) {
      expect(e.details?.issue?.code === 'containsContact', `issue=${JSON.stringify(e.details)}`);
      return 'containsContact';
    }
    throw new Error('통과돼 버림');
  });

  await step('출석은 하루 한 번', async () => {
    const r1 = await A.call('dailyCheckIn', {});
    const r2 = await A.call('dailyCheckIn', {});
    expect(r1.rewarded > 0 && r2.rewarded === 0, `${r1.rewarded}/${r2.rewarded}`);
    return `잔액 ${r2.balance}P`;
  });

  await step('상점: 잔액 부족이면 거부', () => expectCode(A.call('purchaseItem', { itemId: 'boost', clientRequestId: rid() }), 'INSUFFICIENT_POINTS'));

  await step('지도 집계', async () => {
    const r = await A.call('getRegionStats', {});
    expect(r.mine, '내 지역 없음');
    expect(r.regions.length >= 1, '지역 없음');
    return `${r.regions.length}개 지역, 내 지역=${r.mine}`;
  });

  await step('차단하면 대화가 닫힌다', async () => {
    await B.call('blockUser', { targetUid: A.uid });
    await expectCode(A.call('sendMessage', { conversationId: ctx.conv, text: 'hey', clientRequestId: rid() }), 'CONVERSATION_CLOSED');
    await expectCode(A.call('getProfile', { uid: B.uid }), 'NOT_FOUND');
    return 'CONVERSATION_CLOSED · NOT_FOUND';
  });
} finally {
  // 정리: 탈퇴 = 함수 검증 겸 데이터 삭제
  for (const u of [A, B]) {
    await step(`탈퇴로 정리 (${u.name})`, async () => {
      if (!u.auth.currentUser) return '로그인 안 됨, 건너뜀';
      await u.call('deleteAccount', { confirm: 'DELETE' });
      await expectCode(signInWithEmailAndPassword(u.auth, u.email, password), 'auth/invalid-credential').catch(async (e) => {
        if (String(e.message).includes('user-not-found')) return;
        throw e;
      });
      return '계정·데이터 삭제됨';
    });
  }
  // 탈퇴가 게시물·공개 프로필까지 지웠는지 관리자 권한(REST)으로 확인. GCLOUD_TOKEN 이 있을 때만
  if (process.env.GCLOUD_TOKEN) {
    await step('탈퇴 후 게시물·프로필·지갑이 남지 않았다', async () => {
      const base = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`;
      const paths = [ctx.post && `posts/${ctx.post}`, ...[ctx.a, ctx.b].filter(Boolean).flatMap((x) => [`users_public/${x.uid}`, `wallets/${x.uid}`])].filter(Boolean);
      const left = [];
      for (const p of paths) {
        const r = await fetch(`${base}/${p}`, { headers: { Authorization: `Bearer ${process.env.GCLOUD_TOKEN}` } });
        if (r.status !== 404) left.push(`${p}:${r.status}`);
      }
      expect(!left.length, `남은 문서 ${left.join(', ')}`);
      return `${paths.length}개 문서 모두 404`;
    });
  }
  await Promise.all([A.app, B.app].map((a) => deleteApp(a).catch(() => undefined)));
  console.log(`\n${pass} 통과 · ${fail} 실패`);
  process.exit(fail ? 1 : 0);
}
