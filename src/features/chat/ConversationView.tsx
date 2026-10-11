/**
 * 대화방. 최근 N 건을 실시간 구독하고, 위로 스크롤하면 N 을 늘린다.
 * 보내기는 전부 Functions 로 (sendMessage / finalizeChatImage).
 */

import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';

import { REPORT_REASONS, type ReportReason } from '@shared/api';
import { otherMember, type Message, type UserPublic } from '@shared/models';
import { can } from '@shared/permissions';
import { LIMITS } from '@shared/validators';

import { call, newRequestId, toApiError } from '@/firebase/api';
import { queries, refs } from '@/firebase/collections';
import { useDoc, useQuery } from '@/firebase/hooks';
import { pickImage, uploadImage, useStorageUrl } from '@/firebase/storage';
import { regionName, useT } from '@/i18n';
import { useClaims, useUid } from '@/store/session';
import { useWallet } from '@/store/wallet';
import { confirm, notify } from '@/ui/notify';
import { Avatar, Button, Chip, Empty, Icon, Loading, Photo, Row, Sheet, Stack, Text } from '@/ui/primitives';
import { font, radius, space, useColors, useScheme } from '@/ui/theme';
import { useNow } from '@/ui/useNow';

import { currentCoords } from '../location/current';

const PAGE = 30;
const SHARE_MINUTES = [15, 30, 60] as const;

function Bubble({ m, mine, read }: { m: Message; mine: boolean; read: boolean }) {
  const colors = useColors();
  const { t } = useT();
  const img = useStorageUrl(m.type === 'image' ? m.imagePath : null);
  if (m.type === 'system') {
    return (
      <Text variant="caption" center style={{ marginVertical: space.sm }}>
        {m.systemKey ? t(`chat.system.${m.systemKey}`) : m.text}
      </Text>
    );
  }
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginVertical: 2 }}>
      <View
        style={{
          maxWidth: '78%',
          borderRadius: radius.lg,
          padding: m.type === 'image' ? 4 : space.md,
          backgroundColor: mine ? colors.primary : colors.bgMuted,
        }}
      >
        {m.type === 'image' ? (
          <View style={{ width: 200 }}>
            <Photo source={img ? { uri: img } : undefined} aspect={1} />
          </View>
        ) : (
          <Text color={mine ? colors.textInverse : colors.text}>{m.text}</Text>
        )}
      </View>
      {mine && read ? <Text variant="caption">{t('chat.read')}</Text> : null}
    </View>
  );
}

export function ConversationView({ id, embedded }: { id: string; embedded?: boolean }) {
  const colors = useColors();
  const scheme = useScheme();
  const { t, locale } = useT();
  const me = useUid();
  const claims = useClaims();
  const conv = useDoc(refs.conversation(id));
  const [limitN, setLimitN] = useState(PAGE);
  const msgs = useQuery(queries.recentMessages(id, limitN), `msgs:${id}:${limitN}`);
  const peerUid = conv.data && me ? otherMember(conv.data.members, me) : null;
  const peer = useDoc(peerUid ? refs.userPublic(peerUid) : null).data as UserPublic | null;
  const peerAvatar = useStorageUrl(peer?.photos[0]);
  const now = useNow();
  const readReceipt = useWallet((s) => (s.wallet?.perks.readReceipt ?? 0) > now);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // 새 메시지가 오면 읽음 처리
  const newest = msgs.data[0]?.createdAt ?? 0;
  useEffect(() => {
    if (!me || !conv.data) return;
    if ((conv.data.unread?.[me] ?? 0) > 0) call('markConversationRead', { conversationId: id }).catch(() => undefined);
  }, [id, me, newest, conv.data]);

  const peerReadAt = peerUid ? (conv.data?.readAt?.[peerUid] ?? 0) : 0;
  const lastMineId = useMemo(() => msgs.data.find((m) => m.senderUid === me)?.id, [msgs.data, me]);

  if (conv.loading) return <Loading />;
  if (!conv.data || !me) return <Empty title={t('chat.notFound')} />;
  const closed = Boolean(conv.data.closedBy);
  const canImage = can(claims, 'chat.sendImage');
  const canShare = can(claims, 'location.liveShare');

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await call('sendMessage', { conversationId: id, text: body, clientRequestId: newRequestId() });
      setText('');
      inputRef.current?.focus();
    } catch (e) {
      notify(toApiError(e).message);
    } finally {
      setSending(false);
    }
  }

  async function sendImage() {
    if (!canImage) {
      if (await confirm(t('chat.photoLockedTitle'), t('chat.photoLockedBody'), t('chat.photoLockedAction'))) {
        router.push('/profile/phone-verify');
      }
      return;
    }
    try {
      const asset = await pickImage();
      if (!asset || !me) return;
      setSending(true);
      const path = await uploadImage(asset.uri, `chat/${id}/${me}`);
      await call('finalizeChatImage', { conversationId: id, path, clientRequestId: newRequestId() });
    } catch (e) {
      notify(toApiError(e).message);
    } finally {
      setSending(false);
    }
  }

  async function shareLocation(minutes: (typeof SHARE_MINUTES)[number]) {
    setMenu(false);
    try {
      const c = await currentCoords();
      const res = await call('startLocationShare', { conversationId: id, minutes, lat: c.lat, lng: c.lng });
      router.push({ pathname: '/chat/share/[id]', params: { id: res.shareId } });
    } catch (e) {
      notify(toApiError(e).message);
    }
  }

  async function block() {
    setMenu(false);
    if (!peerUid) return;
    if (!(await confirm(t('chat.blockTitle'), t('chat.blockBody'), t('common.block')))) return;
    try {
      await call('blockUser', { targetUid: peerUid });
      if (!embedded) router.back();
    } catch (e) {
      notify(toApiError(e).message);
    }
  }

  async function sendReport(reason: ReportReason) {
    setReport(false);
    if (!peerUid) return;
    try {
      await call('reportUser', { targetUid: peerUid, reason, refPath: `conversations/${id}` });
      notify(t('chat.reportDone'), t('chat.reportDoneBody'));
    } catch (e) {
      notify(toApiError(e).message);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Row style={{ padding: space.md, borderBottomWidth: 1, borderBottomColor: colors.border, justifyContent: 'space-between' }}>
        <Row gap={space.md}>
          {!embedded ? (
            <Pressable onPress={() => router.back()} accessibilityLabel={t('common.back')}>
              <Icon name="chevron-back" />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => peerUid && router.push({ pathname: '/profile/[uid]', params: { uid: peerUid } })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}
          >
            <Avatar uri={peerAvatar} name={peer?.nickname} size={36} />
            <Stack gap={0}>
              <Text variant="label">{peer?.nickname ?? t('chat.unknownUser')}</Text>
              <Text variant="caption">{(peer && regionName(peer.regionLabels, peer.regionLabel, locale)) ?? ''}</Text>
            </Stack>
          </Pressable>
        </Row>
        <Pressable onPress={() => setMenu(true)} accessibilityLabel={t('chat.menu')}>
          <Icon name="ellipsis-horizontal" />
        </Pressable>
      </Row>

      <FlatList
        inverted
        data={msgs.data}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: space.md }}
        onEndReached={() => {
          if (msgs.data.length >= limitN) setLimitN((n) => n + PAGE);
        }}
        onEndReachedThreshold={0.3}
        renderItem={({ item }) => (
          <Bubble m={item} mine={item.senderUid === me} read={readReceipt && item.id === lastMineId && peerReadAt >= item.createdAt} />
        )}
        ListEmptyComponent={
          <Text variant="caption" center style={{ padding: space.xl }}>
            {conv.data.kind === 'intro' ? t('chat.helloIntro') : t('chat.helloMatch')}
          </Text>
        }
      />

      {closed ? (
        <Text variant="caption" center style={{ padding: space.lg }}>
          {t('chat.closed')}
        </Text>
      ) : (
        <Row style={{ padding: space.sm, borderTopWidth: 1, borderTopColor: colors.border }} gap={space.sm}>
          <Pressable onPress={sendImage} accessibilityLabel={t('chat.sendPhoto')} style={{ padding: space.sm }}>
            <Icon name={canImage ? 'image-outline' : 'lock-closed-outline'} color={colors.textMuted} />
          </Pressable>
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={colors.textMuted}
            keyboardAppearance={scheme}
            maxLength={LIMITS.MESSAGE_MAX}
            multiline
            onSubmitEditing={send}
            style={{
              flex: 1,
              maxHeight: 120,
              paddingHorizontal: space.md,
              paddingVertical: space.sm,
              borderRadius: radius.lg,
              backgroundColor: colors.bgMuted,
              fontSize: font.size.md,
              color: colors.text,
            }}
          />
          <Button title={t('chat.send')} small onPress={send} loading={sending} disabled={!text.trim()} />
        </Row>
      )}

      <Sheet visible={menu} onClose={() => setMenu(false)} title={t('chat.menuTitle')}>
        <Stack gap={space.md}>
          <Text variant="label">{canShare ? t('chat.liveShare') : t('chat.liveShareLocked')}</Text>
          {canShare ? (
            <Row>
              {SHARE_MINUTES.map((n) => (
                <Chip key={n} label={t('chat.minutes', { n })} onPress={() => shareLocation(n)} />
              ))}
            </Row>
          ) : (
            <Button
              title={t('chat.verifyPhone')}
              kind="secondary"
              small
              onPress={() => {
                setMenu(false);
                router.push('/profile/phone-verify');
              }}
            />
          )}
          <Button
            title={t('chat.report')}
            kind="secondary"
            onPress={() => {
              setMenu(false);
              setReport(true);
            }}
          />
          <Button title={t('chat.block')} kind="danger" onPress={block} />
        </Stack>
      </Sheet>

      <Sheet visible={report} onClose={() => setReport(false)} title={t('chat.reportTitle')}>
        <Stack gap={space.sm}>
          {REPORT_REASONS.map((r) => (
            <Button key={r} title={t(`reportReasons.${r}`)} kind="secondary" onPress={() => sendReport(r)} />
          ))}
        </Stack>
      </Sheet>
    </KeyboardAvoidingView>
  );
}
