/**
 * 로컬 에뮬레이터(demo-meesae)에 가짜 사용자·게시물을 넣는다. 실제 프로젝트에는 절대 쓰지 않는다.
 *
 *   npm run emulators      (다른 터미널)
 *   npm run seed
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
const PROJECT = 'demo-meesae';
if (!process.env.FIRESTORE_EMULATOR_HOST.includes('127.0.0.1') && !process.env.FIRESTORE_EMULATOR_HOST.includes('localhost')) {
  throw new Error('에뮬레이터에서만 실행한다');
}

initializeApp({ projectId: PROJECT });
const db = getFirestore();

// 구 이름(현지), 영어 이름, 시도, 대략적인 중심 (공개 마커는 이 근처 격자 중심)
const DISTRICTS = [
  ['성북구', 'Seongbuk-gu', '서울특별시', 37.5894, 127.0167],
  ['강남구', 'Gangnam-gu', '서울특별시', 37.4979, 127.0276],
  ['마포구', 'Mapo-gu', '서울특별시', 37.5663, 126.9019],
  ['송파구', 'Songpa-gu', '서울특별시', 37.5145, 127.1059],
  ['종로구', 'Jongno-gu', '서울특별시', 37.5735, 126.979],
  ['해운대구', 'Haeundae-gu', '부산광역시', 35.1631, 129.1635],
  ['수원시', 'Suwon', '경기도', 37.2636, 127.0286],
];
const NAMES = ['하늘', '지우', '서연', '도윤', '민준', '수아', '예준', '하린', '시우', '지아', '유나', '건우', '서윤', '은우'];
const MBTI = ['ENFP', 'INFJ', 'ISTJ', 'ENTP', 'INTJ', 'ESFJ', null];
const now = Date.now();

const batch = db.batch();
const counts = new Map();
NAMES.forEach((name, i) => {
  const uid = `seed-${i}`;
  const [label, labelEn, admin1, lat, lng] = DISTRICTS[i % DISTRICTS.length];
  const regionLabels = { ko: label, en: labelEn };
  const regionKey = `KR~${admin1}~${label}`;
  counts.set(regionKey, { label, regionLabels, lat, lng, n: (counts.get(regionKey)?.n ?? 0) + 1 });
  batch.set(db.doc(`users_public/${uid}`), {
    uid,
    nickname: name,
    age: 22 + (i % 14),
    gender: i % 2 ? 'male' : 'female',
    photos: [`https://picsum.photos/seed/meesae${i}/600/800`],
    mbti: MBTI[i % MBTI.length],
    drinking: ['never', 'sometimes', 'often'][i % 3],
    smoking: 'never',
    job: ['디자이너', '개발자', '간호사', '학생', '마케터'][i % 5],
    school: '',
    countryCode: 'KR',
    regionLabel: label,
    regionLabels,
    regionKey,
    admin1Key: `KR~${admin1}`,
    badges: i % 3 === 0 ? ['phone', 'location'] : ['location'],
    lastActiveAt: now - i * 3_600_000,
    boostUntil: 0,
    visible: true,
    createdAt: now - 86_400_000,
  });
  batch.set(db.doc(`users_private/${uid}`), {
    uid,
    email: null,
    birthDate: '1995-01-01',
    countryCode: 'KR',
    phoneHash: null,
    location: { lat: lat + (i % 3) * 0.004, lng: lng - (i % 2) * 0.004, geohash: '', accuracy: 30, verifiedAt: now },
    regionKey,
    regionLabel: label,
    regionLabels,
    filters: {},
    fcmTokens: [],
    createdAt: now,
  });
  if (i < 5) {
    batch.set(db.doc(`posts/seed-post-${i}`), {
      id: `seed-post-${i}`,
      authorUid: uid,
      author: { nickname: name, photo: `https://picsum.photos/seed/meesae${i}/600/800`, badges: [], regionLabel: label, regionLabels },
      text: ['오늘 성수동 카페 투어 다녀왔어요 ☕', '주말에 한강 러닝 같이 하실 분?', '전시회 추천 받아요 🎨', '비 오는 날엔 역시 국밥', '새로 생긴 베이커리 맛집 발견!'][i],
      imagePaths: [],
      countryCode: 'KR',
      likeCount: i,
      commentCount: 0,
      status: 'visible',
      createdAt: now - i * 1_800_000,
    });
  }
});
for (const [key, { label, regionLabels, lat, lng, n }] of counts) {
  batch.set(
    db.doc(`region_stats/${key}`),
    { regionKey: key, label, labels: regionLabels, countryCode: 'KR', center: { lat, lng }, count: n },
    { merge: true },
  );
}
await batch.commit();
console.log(`seeded ${NAMES.length} users, 5 posts, ${counts.size} regions → ${PROJECT}`);
