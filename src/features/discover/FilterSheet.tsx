import { useState } from 'react';

import type { DiscoverFilters } from '@shared/models';
import { DRINKING, GENDERS, MBTIS, SMOKING } from '@shared/onboarding-schema';

import { useT } from '@/i18n';
import { useWallet } from '@/store/wallet';
import { Button, Chip, Input, Row, Sheet, Stack, Text } from '@/ui/primitives';
import { space } from '@/ui/theme';
import { useNow } from '@/ui/useNow';

function toggle<T>(list: T[] | undefined, v: T): T[] {
  const s = new Set(list ?? []);
  if (s.has(v)) s.delete(v);
  else s.add(v);
  return [...s];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Stack gap={space.sm}>
      <Text variant="subtitle">{title}</Text>
      {children}
    </Stack>
  );
}

/** 열 때마다 부모가 key 를 바꿔 새로 만든다 → value 로 초기화된다 */
export function FilterSheet({
  visible,
  value,
  onClose,
  onApply,
}: {
  visible: boolean;
  value: DiscoverFilters;
  onClose: () => void;
  onApply: (f: DiscoverFilters) => void;
}) {
  const { t } = useT();
  const [f, setF] = useState<DiscoverFilters>(value);
  const now = useNow();
  const extraUntil = useWallet((s) => s.wallet?.perks.extraFilters ?? 0);
  const extra = extraUntil > now;
  const scopes = [
    ['district', t('filters.scopeDistrict')],
    ['admin1', t('filters.scopeAdmin1')],
    ['country', t('filters.scopeCountry')],
  ] as const;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('filters.title')}
      closeLabel={t('common.close')}
      footer={
        <Row gap={space.md}>
          <Button title={t('filters.reset')} kind="ghost" onPress={() => setF({ scope: 'country' })} />
          <Button
            title={t('filters.apply')}
            style={{ flex: 1 }}
            onPress={() => onApply(extra ? f : { ...f, mbti: undefined, drinking: undefined, smoking: undefined })}
          />
        </Row>
      }
    >
      <Stack gap={space.xl} style={{ paddingVertical: space.sm }}>
        <Section title={t('filters.scope')}>
          <Row style={{ flexWrap: 'wrap' }}>
            {scopes.map(([v, label]) => (
              <Chip key={v} label={label} selected={(f.scope ?? 'country') === v} onPress={() => setF({ ...f, scope: v })} />
            ))}
          </Row>
        </Section>
        <Section title={t('filters.gender')}>
          <Row style={{ flexWrap: 'wrap' }}>
            {GENDERS.map((g) => (
              <Chip
                key={g}
                label={t(`options.gender.${g}`)}
                selected={f.genders?.includes(g)}
                onPress={() => setF({ ...f, genders: toggle(f.genders, g) })}
              />
            ))}
          </Row>
        </Section>
        <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
          <Stack style={{ flex: 1 }}>
            <Input
              label={t('filters.minAge')}
              keyboardType="number-pad"
              inputMode="numeric"
              value={f.ageMin?.toString() ?? ''}
              onChangeText={(v) => setF({ ...f, ageMin: v ? Number(v.replace(/\D/g, '')) : undefined })}
            />
          </Stack>
          <Stack style={{ flex: 1 }}>
            <Input
              label={t('filters.maxAge')}
              keyboardType="number-pad"
              inputMode="numeric"
              value={f.ageMax?.toString() ?? ''}
              onChangeText={(v) => setF({ ...f, ageMax: v ? Number(v.replace(/\D/g, '')) : undefined })}
            />
          </Stack>
        </Row>

        <Section title={extra ? t('filters.extra') : t('filters.extraLocked')}>
          {extra ? (
            <Stack gap={space.sm}>
              <Row style={{ flexWrap: 'wrap' }}>
                {MBTIS.map((m) => (
                  <Chip key={m} label={m} small selected={f.mbti?.includes(m)} onPress={() => setF({ ...f, mbti: toggle(f.mbti, m) })} />
                ))}
              </Row>
              <Row style={{ flexWrap: 'wrap' }}>
                {DRINKING.map((d) => (
                  <Chip
                    key={d}
                    label={t(`options.drinking.${d}`)}
                    selected={f.drinking?.includes(d)}
                    onPress={() => setF({ ...f, drinking: toggle(f.drinking, d) })}
                  />
                ))}
              </Row>
              <Row style={{ flexWrap: 'wrap' }}>
                {SMOKING.map((d) => (
                  <Chip
                    key={d}
                    label={t(`options.smoking.${d}`)}
                    selected={f.smoking?.includes(d)}
                    onPress={() => setF({ ...f, smoking: toggle(f.smoking, d) })}
                  />
                ))}
              </Row>
            </Stack>
          ) : (
            <Text variant="bodySm" tone="muted">
              {t('filters.extraHint')}
            </Text>
          )}
        </Section>
      </Stack>
    </Sheet>
  );
}
