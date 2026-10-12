/**
 * 대화방. 최근 N 건을 실시간 구독하고, 위로 스크롤하면 N 을 늘린다.
 * 보내기는 전부 Functions 로 (sendMessage / finalizeChatImage).
 * 같은 사람이 3분 안에 이어 보낸 말풍선은 붙여 그리고, 날짜가 바뀌는 자리에 날짜 알약을 끼운다.
 */

import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';

import { REPORT_REASONS, type ReportReason } from '@shared/api';
import { otherMember, peerLeft, type Message, type UserPublic } from '@shared/models';
import { can } from '@shared/permissions';
import { LIMITS } from '@shared/validators';

import { call, newRequestId, toApiError } from '@/firebase/api';
import { queries, refs } from '@/firebase/collections';
import { useDoc, useQuery } from '@/firebase/hooks';
import { pickImage, uploadImage, useStorageUrl } from '@/firebase/storage';
import { regionName, useT, type T } from '@/i18n';
import { useClaims, useUid } from '@/store/session';
import { useWallet } from '@/store/wallet';
import { KeyboardAvoid } from '@/ui/keyboard';
import { confirm, notify } from '@/ui/notify';
import { Avatar, Chip, Empty, HeaderBar, IconButton, ListGroup, ListRow, Loading, Photo, Pill, Press, Row, Sheet, Stack, Text } from '@/ui/primitives';
import { control, fontFamily, layout, radius, space, type, useColors, useScheme } from '@/ui/theme';
import { useNow } from '@/ui/useNow';

import { currentCoords } from '../location/current';

const PAGE = 30;
const SHARE_MINUTES = [15, 30, 60] as const;
const GROUP_WINDOW_MS = 3 * 60 * 1000;

type RowItem = { kind: 'msg'; m: Message; grouped: boolean } | { kind: 'day'; key: string; at: number };

function dayOf(ms: number): string {
  return new Date(ms).toDateString();
}

function dayLabel(ms: number, now: number, tag: string, t: T): string {
  const d = dayOf(ms);
  if (d === dayOf(now)) return t('chat.today');
  if (d === dayOf(now - 86_400_000)) return t('chat.yesterday');
  return new Date(ms).toLocaleDateString(tag, { month: 'long', day: 'numeric' });
}

/** 역순 목록(최신이 0번)에 묶음·날짜 정보를 붙인다 */
function buildRows(msgs: Message[]): RowItem[] {
  const rows: RowItem[] = [];
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i]!;
    const older = msgs[i + 1];
    const grouped = Boolean(
      older && older.type !== 'system' && m.type !== 'system' && older.senderUid === m.senderUid && m.createdAt - older.createdAt < GROUP_WINDOW_MS && dayOf(older.createdAt) === dayOf(m.createdAt),
    );
    rows.push({ kind: 'msg', m, grouped });
    if (!older || dayOf(older.createdAt) !== dayOf(m.createdAt)) rows.push({ kind: 'day', key: `day:${m.id}`, at: m.createdAt });
  }
  return rows;
}

function Bubble({ m, mine, read, grouped }: { m: Message; mine: boolean; read: boolean; grouped: boolean }) {
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
  const tail = radius.sm;
  const big = 20;
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginTop: grouped ? space.xxs : space.sm }}>
      <View
        style={{
          maxWidth: '78%',
          borderRadius: big,
          borderBottomRightRadius: mine ? tail : big,
          borderBottomLeftRadius: mine ? big : tail,
          padding: m.type === 'image' ? space.xs : undefined,
          paddingHorizontal: m.type === 'image' ? space.xs : space.lg,
          paddingVertical: m.type === 'image' ? space.xs : space.md,
          backgroundColor: mine ? colors.bubbleMine : colors.bubbleTheirs,
        }}
      >
        {m.type === 'image' ? (
          <View style={{ width: layout.bubbleImageWidth }}>
            <Photo source={img ? { uri: img } : undefined} aspect={1} style={{ borderRadius: big - space.xs }} />
          </View>
        ) : (
          <Text color={mine ? colors.onBubbleMine : colors.text}>{m.text}</Text>
        )}
      </View>
      {mine && read ? (
        <Text variant="caption" tone="faint">
          {t('chat.read')}
        </Text>
      ) : null}
    </View>
  );
}

export function ConversationView({ id, embedded }: { id: string; embedded?: boolean }) {
  const colors = useColors();
  const scheme = useScheme();
  const { t, locale, tag } = useT();
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
  const rows = useMemo(() => buildRows(msgs.data), [msgs.data]);

  if (conv.loading) return <Loading />;
  if (!conv.data || !me) return <Empty icon="chatbubble-outline" title={t('chat.notFound')} />;
  const closed = Boolean(conv.data.closedBy);
  const deleted = peerLeft(conv.data, me);
  const canImage = can(claims, 'chat.sendImage');
  const canShare = can(claims, 'location.liveShare');
  const peerName = deleted ? t('chat.deletedUser') : (peer?.nickname ?? t('chat.unknownUser'));

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

  const canSend = Boolean(text.trim()) && !sending;

  return (
    <KeyboardAvoid style={{ flex: 1, backgroundColor: colors.bg }}>
      <HeaderBar
        onBack={embedded ? undefined : () => router.back()}
        backLabel={t('common.back')}
        left={
          <Press
            disabled={deleted}
            haptic={false}
            pressScale={1}
            onPress={() => peerUid && router.push({ pathname: '/profile/[uid]', params: { uid: peerUid } })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}
          >
            <Avatar uri={peerAvatar} name={peer?.nickname} size="sm" icon={deleted ? 'person-remove-outline' : undefined} />
            <Stack gap={0}>
              <Text variant="subtitle" tone={deleted ? 'muted' : 'default'}>
                {peerName}
              </Text>
              <Text variant="caption">{(peer && regionName(peer.regionLabels, peer.regionLabel, locale)) ?? ''}</Text>
            </Stack>
          </Press>
        }
        right={<IconButton name="ellipsis-horizontal" label={t('chat.menu')} variant="ghost" onPress={() => setMenu(true)} />}
      />

      <FlatList
        inverted
        data={rows}
        keyExtractor={(r) => (r.kind === 'day' ? r.key : r.m.id)}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingVertical: space.md }}
        onEndReached={() => {
          if (msgs.data.length >= limitN) setLimitN((n) => n + PAGE);
        }}
        onEndReachedThreshold={0.3}
        renderItem={({ item }) =>
          item.kind === 'day' ? (
            <View style={{ alignItems: 'center', marginVertical: space.lg }}>
              <Pill label={dayLabel(item.at, now, tag, t)} tone="neutral" />
            </View>
          ) : (
            <Bubble
              m={item.m}
              mine={item.m.senderUid === me}
              grouped={item.grouped}
              read={readReceipt && item.m.id === lastMineId && peerReadAt >= item.m.createdAt}
            />
          )
        }
        ListEmptyComponent={
          <Text variant="bodySm" tone="muted" center style={{ padding: space.xl }}>
            {conv.data.kind === 'intro' ? t('chat.helloIntro') : t('chat.helloMatch')}
          </Text>
        }
      />

      {closed ? (
        <Text variant="bodySm" tone="muted" center style={{ padding: space.lg }}>
          {deleted ? t('chat.closedDeleted') : t('chat.closed')}
        </Text>
      ) : (
        <Row
          gap={space.sm}
          style={{
            paddingHorizontal: space.md,
            paddingVertical: space.sm,
            borderTopWidth: 1,
            borderTopColor: colors.hairline,
            backgroundColor: colors.surface,
            alignItems: 'flex-end',
          }}
        >
          <IconButton
            name={canImage ? 'image-outline' : 'lock-closed-outline'}
            label={t('chat.sendPhoto')}
            variant="ghost"
            onPress={sendImage}
            color={colors.textMuted}
          />
          <View
            style={{
              flex: 1,
              minHeight: control.buttonSm,
              maxHeight: layout.chatInputMaxHeight,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.pill,
              paddingHorizontal: space.lg,
              justifyContent: 'center',
            }}
          >
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              placeholder={t('chat.placeholder')}
              placeholderTextColor={colors.textFaint}
              keyboardAppearance={scheme}
              maxLength={LIMITS.MESSAGE_MAX}
              multiline
              onSubmitEditing={send}
              style={{ fontFamily, fontSize: type.body.fontSize, color: colors.text, paddingVertical: space.sm, maxHeight: layout.chatInputMaxHeight - space.sm }}
            />
          </View>
          <IconButton name="arrow-up" label={t('chat.send')} variant="filled" onPress={send} disabled={!canSend} />
        </Row>
      )}

      <Sheet visible={menu} onClose={() => setMenu(false)} title={t('chat.menuTitle')} closeLabel={t('common.close')}>
        <Stack gap={space.lg}>
          <Stack gap={space.sm}>
            <Text variant="subtitle">{canShare ? t('chat.liveShare') : t('chat.liveShareLocked')}</Text>
            {canShare ? (
              <Row>
                {SHARE_MINUTES.map((n) => (
                  <Chip key={n} label={t('chat.minutes', { n })} onPress={() => shareLocation(n)} />
                ))}
              </Row>
            ) : (
              <ListRow
                icon="lock-closed-outline"
                title={t('chat.verifyPhone')}
                onPress={() => {
                  setMenu(false);
                  router.push('/profile/phone-verify');
                }}
              />
            )}
          </Stack>
          <ListGroup>
            <ListRow
              icon="flag-outline"
              title={t('chat.report')}
              onPress={() => {
                setMenu(false);
                setReport(true);
              }}
            />
            <ListRow icon="ban-outline" title={t('chat.block')} destructive onPress={block} />
          </ListGroup>
        </Stack>
      </Sheet>

      <Sheet visible={report} onClose={() => setReport(false)} title={t('chat.reportTitle')} closeLabel={t('common.close')}>
        <ListGroup>
          {REPORT_REASONS.map((r) => (
            <ListRow key={r} title={t(`reportReasons.${r}`)} onPress={() => sendReport(r)} />
          ))}
        </ListGroup>
      </Sheet>
    </KeyboardAvoid>
  );
}
