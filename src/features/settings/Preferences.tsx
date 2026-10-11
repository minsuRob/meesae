/**
 * 언어·화면 모드 선택. 설정 화면과 로그인 화면이 같이 쓴다.
 * 언어 목록은 LOCALES 에서 자동으로 만든다 → 새 언어를 등록하면 여기에도 바로 나온다.
 */

import { LOCALES } from '@shared/i18n';

import { LOCALE_META, useT } from '@/i18n';
import { useLocalePref, type LocalePref } from '@/store/locale';
import { useThemePref, type ThemePref } from '@/store/theme';
import { Segmented } from '@/ui/primitives';

export function LanguagePicker({ withSystem = true }: { withSystem?: boolean }) {
  const { t, locale } = useT();
  const pref = useLocalePref((s) => s.pref);
  const setPref = useLocalePref((s) => s.setPref);
  const options: { value: LocalePref; label: string }[] = [
    ...(withSystem ? [{ value: 'system' as const, label: t('settings.languageSystem') }] : []),
    ...LOCALES.map((l) => ({ value: l, label: LOCALE_META[l].name })),
  ];
  return <Segmented<LocalePref> value={withSystem ? pref : locale} options={options} onChange={setPref} />;
}

export function AppearancePicker() {
  const { t } = useT();
  const pref = useThemePref((s) => s.pref);
  const setPref = useThemePref((s) => s.setPref);
  return (
    <Segmented<ThemePref>
      value={pref}
      onChange={setPref}
      options={[
        { value: 'system', label: t('settings.appearanceSystem') },
        { value: 'light', label: t('settings.appearanceLight') },
        { value: 'dark', label: t('settings.appearanceDark') },
      ]}
    />
  );
}
