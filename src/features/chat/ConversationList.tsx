import { FlatList, Pressable, View } from 'react-native';

import { otherMember, peerLeft, type Conversation, type UserPublic } from '@shared/models';

import { queries, refs } from '@/firebase/collections';
import { useDoc, useQuery } from '@/firebase/hooks';
import { useStorageUrl } from '@/firebase/storage';
import { useT, type T } from '@/i18n';
import { useUid } from '@/store/session';
import { Avatar, Badge, Empty, Loading, Row, Stack, Text } from '@/ui/primitives';
import { radius, space, useColors } from '@/ui/theme';

export function useConversations() {
  const uid = useUid();
  return useQuery(uid ? queries.myConversations(uid) : null, uid ? `convs:${uid}` : null);
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
  const name = deleted ? t('chat.deletedUser') : (peer?.nickname ?? t('chat.unknownUser'));
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        padding: space.md,
        backgroundColor: selected ? colors.primarySoft : pressed ? colors.bgMuted : colors.surface,
      })}
    >
      <Row gap={space.md}>
        <Avatar uri={avatar} name={peer?.nickname} size={48} icon={deleted ? 'person-remove-outline' : undefined} />
        <Stack gap={2} style={{ flex: 1 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row gap={space.xs}>
              <Text variant="label" color={deleted ? colors.textMuted : undefined}>
                {name}
              </Text>
              {c.kind === 'match' ? <Badge label={t('chat.badgeMatch')} color={colors.primary} /> : null}
              {c.closedBy ? <Badge label={t('chat.badgeClosed')} color={colors.textMuted} /> : null}
            </Row>
            <Text variant="caption">{c.lastMessage ? timeLabel(c.lastMessage.at, tag) : ''}</Text>
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text variant="caption" numberOfLines={1} style={{ flex: 1 }}>
              {previewText(c, t)}
            </Text>
            {unread > 0 ? (
              <View
                style={{
                  minWidth: 20,
                  paddingHorizontal: 6,
                  borderRadius: radius.pill,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                }}
              >
                <Text variant="caption" color={colors.textInverse}>
                  {unread > 99 ? '99+' : unread}
                </Text>
              </View>
            ) : null}
          </Row>
        </Stack>
      </Row>
    </Pressable>
  );
}

export function ConversationList({ selectedId, onOpen }: { selectedId?: string; onOpen: (id: string) => void }) {
  const colors = useColors();
  const { t } = useT();
  const me = useUid();
  const { data, loading, error } = useConversations();
  if (!me || loading) return <Loading />;
  if (error) return <Empty title={t('chat.loadFailed')} />;
  if (!data.length) return <Empty title={t('chat.empty')} body={t('chat.emptyBody')} />;
  return (
    <FlatList
      data={data}
      keyExtractor={(c) => c.id}
      ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
      renderItem={({ item }) => <ConversationRow c={item} me={me} selected={item.id === selectedId} onPress={() => onOpen(item.id)} />}
    />
  );
}
