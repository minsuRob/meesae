/**
 * 언어·화면 모드 선택. 설정 화면은 행(ListRow)+시트, 로그인 화면은 작은 알약 토글을 쓴다.
 * 언어 목록은 LOCALES 에서 자동으로 만든다 → 새 언어를 등록하면 여기에도 바로 나온다.
 */

import { useState } from 'react';

import { LOCALES } from '@shared/i18n';

import { LOCALE_META, useT } from '@/i18n';
import { useLocalePref, type LocalePref } from '@/store/locale';
import { useThemePref, type ThemePref } from '@/store/theme';
import { Icon, ListGroup, ListRow, Segmented, Sheet, type IconName } from '@/ui/primitives';
import { useColors } from '@/ui/theme';

/** 로그인 화면용 알약 토글 (시스템 항목 없음) */
export function LanguageSegmented() {
  const { locale } = useT();
  const setPref = useLocalePref((s) => s.setPref);
  return <Segmented<LocalePref> value={locale} options={LOCALES.map((l) => ({ value: l, label: LOCALE_META[l].name }))} onChange={setPref} />;
}

function OptionRow<T extends string>({
  icon,
  title,
  value,
  options,
  onChange,
}: {
  icon: IconName;
  title: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const colors = useColors();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label ?? '';
  return (
    <>
      <ListRow icon={icon} title={title} value={current} chevron onPress={() => setOpen(true)} />
      <Sheet visible={open} onClose={() => setOpen(false)} title={title} closeLabel={t('common.close')}>
        <ListGroup>
          {options.map((o) => (
            <ListRow
              key={o.value}
              title={o.label}
              trailing={o.value === value ? <Icon name="checkmark" size="md" color={colors.text} /> : undefined}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}
            />
          ))}
        </ListGroup>
      </Sheet>
    </>
  );
}

export function LanguageRow() {
  const { t } = useT();
  const pref = useLocalePref((s) => s.pref);
  const setPref = useLocalePref((s) => s.setPref);
  return (
    <OptionRow<LocalePref>
      icon="globe-outline"
      title={t('settings.language')}
      value={pref}
      onChange={setPref}
      options={[{ value: 'system', label: t('settings.languageSystem') }, ...LOCALES.map((l) => ({ value: l, label: LOCALE_META[l].name }))]}
    />
  );
}

export function AppearanceRow() {
  const { t } = useT();
  const pref = useThemePref((s) => s.pref);
  const setPref = useThemePref((s) => s.setPref);
  return (
    <OptionRow<ThemePref>
      icon="moon-outline"
      title={t('settings.appearance')}
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
