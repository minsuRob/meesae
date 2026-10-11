/**
 * 프로필 생성·수정. 공개 문서에 들어가는 필드는 여기서만 정한다 (화이트리스트).
 */

import { isCountryCode } from '../../../shared/countries';
import type { UserInternal, UserPrivate, UserPublic } from '../../../shared/models';
import {
  ageFrom,
  FIELD_VALIDATORS,
  isProfileComplete,
  validateDraft,
  type DraftField,
  type OnboardingDraft,
} from '../../../shared/onboarding-schema';
import { admin1KeyOf } from '../../../shared/region';
import { checkNickname, checkShortField, LIMITS } from '../../../shared/validators';
import { bucket } from '../lib/admin';
import { appError, invalid } from '../lib/errors';
import { callable, need } from '../lib/guard';
import { loadEconomy, runWalletTx } from '../lib/ledger';
import { ensureRegionCenter, internalRef, mergeClaims, moveRegionStat, privateRef, publicRef } from '../lib/users';

async function assertPhotosExist(paths: string[]): Promise<void> {
  const results = await Promise.all(paths.map((p) => bucket().file(p).exists()));
  if (results.some(([ok]) => !ok)) throw appError('PHOTO_MISSING');
}

export const completeOnboarding = callable('completeOnboarding', {}, async ({ draft }, ctx) => {
  const t = Date.now();
  const checked = validateDraft((draft ?? {}) as OnboardingDraft, { uid: ctx.uid, nowMs: t });
  if (!checked.ok) throw invalid(Object.values(checked.errors)[0]);
  const v = checked.value;
  await assertPhotosExist(v.photos);
  const eco = await loadEconomy();

  const result = await runWalletTx(ctx.uid, null, async (w, tx) => {
    const [pubSnap, privSnap, intSnap] = await Promise.all([
      tx.get(publicRef(ctx.uid)),
      tx.get(privateRef(ctx.uid)),
      tx.get(internalRef(ctx.uid)),
    ]);
    const priv = privSnap.data() as Partial<UserPrivate> | undefined;
    const internal = intSnap.data() as Partial<UserInternal> | undefined;

    const pub: UserPublic = {
      uid: ctx.uid,
      nickname: v.nickname,
      age: ageFrom(v.birthDate, t)!,
      gender: v.gender,
      photos: v.photos,
      mbti: v.mbti ?? null,
      drinking: v.drinking ?? null,
      smoking: v.smoking ?? null,
      job: v.job,
      school: v.school,
      countryCode: v.countryCode,
      regionLabel: priv?.regionLabel ?? null,
      regionLabels: priv?.regionLabels ?? {},
      regionKey: priv?.regionKey ?? null,
      admin1Key: priv?.regionKey ? admin1KeyOf(priv.regionKey) : null,
      badges: ctx.claims.phoneVerified ? ['phone'] : [],
      lastActiveAt: t,
      boostUntil: 0,
      visible: true,
      createdAt: (pubSnap.get('createdAt') as number | undefined) ?? t,
    };
    if (priv?.location) pub.badges.push('location');

    tx.set(publicRef(ctx.uid), pub);
    tx.set(
      privateRef(ctx.uid),
      {
        uid: ctx.uid,
        email: ctx.email,
        birthDate: v.birthDate,
        countryCode: v.countryCode,
        phoneHash: priv?.phoneHash ?? null,
        location: priv?.location ?? null,
        regionKey: priv?.regionKey ?? null,
        regionLabel: priv?.regionLabel ?? null,
        regionLabels: priv?.regionLabels ?? {},
        filters: priv?.filters ?? {},
        fcmTokens: priv?.fcmTokens ?? [],
        createdAt: priv?.createdAt ?? t,
      } satisfies UserPrivate,
    );

    // 처음 공개될 때만 지도 집계에 더한다 (재시도해도 두 번 세지 않게)
    if (!pubSnap.exists && priv?.regionKey && priv.location) {
      moveRegionStat(tx, null, {
        regionKey: priv.regionKey,
        label: priv.regionLabel ?? '',
        labels: priv.regionLabels ?? {},
        countryCode: v.countryCode,
        location: priv.location,
      });
    }

    let rewarded = 0;
    if (isProfileComplete(v) && !internal?.rewards?.profileComplete) {
      rewarded = eco.PROFILE_COMPLETE_REWARD;
      w.grant(rewarded, 'profileComplete');
      tx.set(internalRef(ctx.uid), { rewards: { profileComplete: true } }, { merge: true });
    }
    return { ok: true as const, rewarded, regionKey: priv?.regionKey ?? null, location: priv?.location ?? null };
  });

  if (result.regionKey && result.location) await ensureRegionCenter(result.regionKey, result.location);
  await mergeClaims(ctx.uid, { onboarded: true });
  return { ok: true, rewarded: result.rewarded };
});

const EDITABLE: DraftField[] = ['nickname', 'photos', 'mbti', 'drinking', 'smoking', 'job', 'school'];

export const updateProfile = callable('updateProfile', { action: 'profile.edit' }, async (req, ctx) => {
  const patch: Partial<UserPublic> = {};
  const draft = req as OnboardingDraft;
  for (const field of EDITABLE) {
    if (!(field in req)) continue;
    const err = FIELD_VALIDATORS[field](draft, { uid: ctx.uid, nowMs: Date.now() });
    if (err) throw invalid(err);
  }
  if ('nickname' in req) {
    const r = checkNickname(req.nickname);
    if (r.ok) patch.nickname = r.value;
  }
  if (req.photos) {
    await assertPhotosExist(req.photos);
    patch.photos = [...req.photos];
  }
  if ('mbti' in req) patch.mbti = req.mbti ?? null;
  if ('drinking' in req) patch.drinking = req.drinking ?? null;
  if ('smoking' in req) patch.smoking = req.smoking ?? null;
  if ('job' in req) {
    const r = checkShortField(req.job, 'job', LIMITS.JOB_MAX);
    if (r.ok) patch.job = r.value;
  }
  if ('school' in req) {
    const r = checkShortField(req.school, 'school', LIMITS.SCHOOL_MAX);
    if (r.ok) patch.school = r.value;
  }
  need(Object.keys(patch).length > 0, 'nothing to update');

  const eco = await loadEconomy();
  await runWalletTx(ctx.uid, null, async (w, tx) => {
    const [pubSnap, intSnap] = await Promise.all([tx.get(publicRef(ctx.uid)), tx.get(internalRef(ctx.uid))]);
    if (!pubSnap.exists) throw appError('NOT_ONBOARDED');
    const merged = { ...(pubSnap.data() as UserPublic), ...patch };
    tx.update(publicRef(ctx.uid), patch);
    if (isProfileComplete(merged) && !intSnap.get('rewards.profileComplete')) {
      w.grant(eco.PROFILE_COMPLETE_REWARD, 'profileComplete');
      tx.set(internalRef(ctx.uid), { rewards: { profileComplete: true } }, { merge: true });
    }
    return {};
  });
  return { ok: true };
});

export const setCountry = callable('setCountry', { action: 'profile.edit' }, async ({ countryCode }, ctx) => {
  need(isCountryCode(countryCode), 'bad country');
  const code = countryCode.toUpperCase();
  const batch = publicRef(ctx.uid).firestore.batch();
  batch.update(publicRef(ctx.uid), { countryCode: code });
  batch.set(privateRef(ctx.uid), { countryCode: code }, { merge: true });
  await batch.commit();
  return { ok: true };
});
