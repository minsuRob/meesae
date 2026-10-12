import { FlatList, View } from 'react-native';

import { otherMember, peerLeft, type Conversation, type UserPublic } from '@shared/models';
import { isOnline } from '@shared/presence';

import { queries, refs } from '@/firebase/collections';
import { useDoc, useQuery } from '@/firebase/hooks';
import { useStorageUrl } from '@/firebase/storage';
import { useT, type T } from '@/i18n';
import { useUid } from '@/store/session';
import { Avatar, Divider, Empty, Pill, Press, Row, SkeletonList, Stack, Text } from '@/ui/primitives';
import { space, useColors } from '@/ui/theme';
import { useNow } from '@/ui/useNow';

export function useConversations() {
  const uid = useUid();
  return useQuery(uid ? queries.myConversations(uid) : null, uid ? `convs:${uid}` : null);
}

/** 모든 대화의 안 읽은 메시지 합 (탭·사이드바 배지) */
export function useUnreadCount(): number {
  const uid = useUid();
  const { data } = useConversations();
  if (!uid) return 0;
  return data.reduce((sum, c) => sum + (c.unread?.[uid] ?? 0), 0);
}

function timeLabel(ms: number, tag: string): string {
  const d = new Date(ms);
  if (d.toDateString() === new Date().toDateString()) {
    return d.toLocaleTimeString(tag, { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString(tag, { month: 'numeric', day: 'numeric' });
}

/** 목록 미리보기 문구. 사진·시스템 메시지는 서버가 글자 없이 type 만 남긴다 */
export function previewText(c: Conversation, t: T): string {
  const m = c.lastMessage;
  if (!m) return c.kind === 'intro' ? t('chat.newIntro') : '';
  if (m.type === 'image') return t('chat.photo');
  if (m.type === 'system') return m.systemKey ? t(`chat.system.${m.systemKey}`) : '';
  return m.text;
}

function ConversationRow({ c, me, selected, onPress }: { c: Conversation; me: string; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  const { t, tag } = useT();
  const peerUid = otherMember(c.members, me);
  const peer = useDoc(refs.userPublic(peerUid)).data as UserPublic | null;
  const avatar = useStorageUrl(peer?.photos[0]);
  const unread = c.unread?.[me] ?? 0;
  const deleted = peerLeft(c, me);
  const now = useNow(60_000);
  const online = !deleted && isOnline(peer?.lastActiveAt, now);
  const name = deleted ? t('chat.deletedUser') : (peer?.nickname ?? t('chat.unknownUser'));
  return (
    <Press
      onPress={onPress}
      haptic={false}
      pressScale={1}
      accessibilityRole="button"
      style={(pressed) => ({
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
        backgroundColor: selected || pressed ? colors.bgMuted : colors.surface,
      })}
    >
      <Row gap={space.md}>
        <Avatar uri={avatar} name={peer?.nickname} size="lg" icon={deleted ? 'person-remove-outline' : undefined} verified={!online && peer?.badges.includes('phone')} online={online} />
        <Stack gap={space.xxs} style={{ flex: 1 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row gap={space.xs} style={{ flex: 1 }}>
              <Text variant="subtitle" tone={deleted ? 'muted' : 'default'} numberOfLines={1} style={{ flexShrink: 1 }}>
                {name}
              </Text>
              {c.kind === 'match' ? <Pill label={t('chat.badgeMatch')} tone="primary" /> : null}
              {c.closedBy ? <Pill label={t('chat.badgeClosed')} tone="neutral" /> : null}
            </Row>
            <Text variant="caption" tone="faint" tabular>
              {c.lastMessage ? timeLabel(c.lastMessage.at, tag) : ''}
            </Text>
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text variant="bodySm" tone={unread > 0 ? 'default' : 'muted'} numberOfLines={1} style={[{ flex: 1 }, unread > 0 && { fontWeight: '500' }]}>
              {previewText(c, t)}
            </Text>
            {unread > 0 ? <Pill label={unread > 99 ? '99+' : String(unread)} tone="primary" /> : null}
          </Row>
        </Stack>
      </Row>
    </Press>
  );
}

export function ConversationList({ selectedId, onOpen }: { selectedId?: string; onOpen: (id: string) => void }) {
  const { t } = useT();
  const me = useUid();
  const { data, loading, error } = useConversations();
  if (!me || loading) return <SkeletonList kind="row" count={5} />;
  if (error) return <Empty icon="alert-circle-outline" title={t('chat.loadFailed')} />;
  if (!data.length) return <Empty icon="chatbubbles-outline" title={t('chat.empty')} body={t('chat.emptyBody')} />;
  return (
    <FlatList
      data={data}
      keyExtractor={(c) => c.id}
      ItemSeparatorComponent={() => (
        <View style={{ paddingLeft: space.lg + 48 + space.md }}>
          <Divider />
        </View>
      )}
      renderItem={({ item }) => <ConversationRow c={item} me={me} selected={item.id === selectedId} onPress={() => onOpen(item.id)} />}
    />
  );
}
