import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { LIMITS } from '@shared/validators';

import { call, newRequestId, toApiError } from '@/firebase/api';
import { pickImage, uploadImage, useStorageUrl } from '@/firebase/storage';
import { useT } from '@/i18n';
import { useUid } from '@/store/session';
import { Button, ErrorText, Input, Photo, Row, Sheet, Stack, Text } from '@/ui/primitives';
import { radius, space, useColors } from '@/ui/theme';

function Thumb({ path, onRemove }: { path: string; onRemove: () => void }) {
  const { t } = useT();
  const url = useStorageUrl(path);
  return (
    <Pressable onPress={onRemove} style={{ width: 72 }} accessibilityLabel={t('onboarding.removePhoto')}>
      <Photo source={url ? { uri: url } : undefined} aspect={1} />
    </Pressable>
  );
}

export function PostComposer({ visible, onClose, onPosted }: { visible: boolean; onClose: () => void; onPosted: (id: string) => void }) {
  const colors = useColors();
  const { t } = useT();
  const uid = useUid();
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 같은 글을 재시도할 때 중복 게시를 막는 키. 성공하면 새로 만든다.
  const [requestId, setRequestId] = useState(newRequestId);

  async function addImage() {
    if (!uid) return;
    try {
      const a = await pickImage();
      if (!a) return;
      setBusy(true);
      const path = await uploadImage(a.uri, `posts/${uid}`);
      setImages((xs) => [...xs, path]);
    } catch (e) {
      setError(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await call('createPost', { text, imagePaths: images, clientRequestId: requestId });
      setText('');
      setImages([]);
      setRequestId(newRequestId());
      onPosted(res.postId);
    } catch (e) {
      setError(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={t('feed.composerTitle')}>
      <Stack gap={space.md}>
        <Input
          value={text}
          onChangeText={setText}
          placeholder={t('feed.composerPlaceholder')}
          multiline
          maxLength={LIMITS.POST_MAX}
          style={{ minHeight: 120, textAlignVertical: 'top' }}
        />
        <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
          {images.map((p) => (
            <Thumb key={p} path={p} onRemove={() => setImages((xs) => xs.filter((x) => x !== p))} />
          ))}
          {images.length < LIMITS.POST_IMAGES_MAX ? (
            <Pressable
              onPress={addImage}
              accessibilityLabel={t('onboarding.addPhoto')}
              style={{
                width: 72,
                height: 72,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text color={colors.textMuted}>＋</Text>
            </Pressable>
          ) : null}
        </Row>
        <ErrorText>{error}</ErrorText>
        <View>
          <Button title={t('feed.publish')} onPress={submit} loading={busy} disabled={!text.trim()} />
        </View>
        <Text variant="caption">{t('feed.noContacts')}</Text>
      </Stack>
    </Sheet>
  );
}
