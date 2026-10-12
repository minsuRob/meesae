/**
 * 개발용 UI 갤러리: 모든 기본 컴포넌트를 라이트·다크 두 열로 나란히 그린다.
 * 웹에서 /dev/ui 로 연다. 배포 빌드에서는 홈으로 돌려보낸다.
 */

import { Redirect } from 'expo-router';
import { ScrollView, View } from 'react-native';

import {
  Avatar,
  Button,
  Card,
  Chip,
  Divider,
  HeaderBar,
  IconButton,
  Input,
  ListGroup,
  ListRow,
  Pill,
  Row,
  Segmented,
  Skeleton,
  SkeletonCard,
  Stack,
  Tabs,
  Text,
  toast,
} from '@/ui/primitives';
import { SchemeOverride, palettes, space, useColors, type Scheme } from '@/ui/theme';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Stack gap={space.md}>
      <Text variant="heading">{title}</Text>
      {children}
    </Stack>
  );
}

function Column({ scheme }: { scheme: Scheme }) {
  const colors = useColors();
  const palette = palettes[scheme];
  return (
    <View style={{ flex: 1, minWidth: 360, backgroundColor: colors.bg }}>
      <HeaderBar title={scheme === 'light' ? '라이트' : '다크'} wordmark={false} right={<Pill label="100P" tone="outline" icon="diamond-outline" />}>
        <Tabs value="a" onChange={() => undefined} options={[{ value: 'a', label: '추천' }, { value: 'b', label: '대화' }]} />
      </HeaderBar>
      <Stack gap={space.xl} style={{ padding: space.lg }}>
        <Section title="글자">
          <Text variant="display">display 28 / 700</Text>
          <Text variant="title">title 22 / 600</Text>
          <Text variant="heading">heading 20 / 600</Text>
          <Text variant="subtitle">subtitle 16 / 600</Text>
          <Text>body 16 / 400 기본 본문이에요</Text>
          <Text variant="bodySm" tone="muted">
            bodySm muted 14
          </Text>
          <Text variant="caption">caption 13 muted</Text>
          <Text variant="caption" tone="faint">
            caption faint 13
          </Text>
          <Text variant="micro">micro 12 / 700</Text>
        </Section>

        <Section title="버튼">
          <Row style={{ flexWrap: 'wrap' }}>
            <Button title="좋아요" />
            <Button title="대화" kind="secondary" />
            <Button title="건너뛰기" kind="ghost" />
            <Button title="차단" kind="danger" />
          </Row>
          <Row style={{ flexWrap: 'wrap' }}>
            <Button title="비활성" disabled />
            <Button title="로딩" loading />
            <Button title="작은 알약" small pill />
            <Button title="작은 보조" small pill kind="secondary" />
          </Row>
          <Row style={{ flexWrap: 'wrap' }}>
            <IconButton name="options-outline" label="필터" />
            <IconButton name="ellipsis-horizontal" label="메뉴" variant="ghost" />
            <IconButton name="arrow-up" label="보내기" variant="filled" />
            <IconButton name="close" label="닫기" variant="onPhoto" size="sm" />
            <IconButton name="create-outline" label="글쓰기" variant="filled" size="lg" />
          </Row>
        </Section>

        <Section title="칩·알약">
          <Row style={{ flexWrap: 'wrap' }}>
            <Chip label="전체" selected />
            <Chip label="가까운 동네" />
            <Chip label="ENFP" small selected />
            <Chip label="INFJ" small />
            <Chip label="아이콘" icon="location-outline" />
          </Row>
          <Row style={{ flexWrap: 'wrap' }}>
            <Pill label="중립" />
            <Pill label="테두리" tone="outline" />
            <Pill label="인증" tone="onPhoto" icon="checkmark-circle" />
            <Pill label="매치" tone="primary" />
            <Pill label="완료" tone="success" icon="checkmark-circle" />
            <Pill label="접속 중" tone="online" />
          </Row>
        </Section>

        <Section title="입력">
          <Input label="닉네임" placeholder="2~12자" />
          <Input label="오류" value="abc" error="이미 쓰고 있는 닉네임이에요" />
          <Input label="힌트" placeholder="1995-04-12" hint="나이만 보이고 생년월일은 공개되지 않아요" />
          <Segmented value="system" onChange={() => undefined} options={[{ value: 'system', label: '시스템' }, { value: 'light', label: '라이트' }, { value: 'dark', label: '다크' }]} />
        </Section>

        <Section title="아바타·카드">
          <Row>
            <Avatar name="하" size="xs" />
            <Avatar name="늘" size="sm" verified />
            <Avatar name="도" size="md" online />
            <Avatar name="윤" size="lg" verified />
            <Avatar icon="person-remove-outline" size="lg" />
          </Row>
          <Card>
            <Text variant="subtitle">테두리 카드</Text>
            <Text variant="bodySm" tone="muted">
              1px 테두리, 그림자 없음
            </Text>
          </Card>
          <Card elevation={1} outlined={false}>
            <Text variant="subtitle">떠 있는 카드</Text>
            <Text variant="bodySm" tone="muted">
              그림자 한 단계 (다크에서는 표면 밝기)
            </Text>
          </Card>
          <SkeletonCard />
          <Skeleton width="50%" />
        </Section>

        <Section title="목록">
          <ListGroup>
            <ListRow icon="calendar-outline" title="출석 체크" subtitle="하루 한 번 +10P" trailing={<Button title="받기" small pill />} />
            <ListRow icon="globe-outline" title="언어" value="한국어" chevron onPress={() => toast('토스트가 떴어요')} />
            <ListRow icon="trash-outline" title="회원 탈퇴" destructive onPress={() => undefined} />
          </ListGroup>
          <Divider />
        </Section>

        <Section title="팔레트">
          <Row style={{ flexWrap: 'wrap' }} gap={space.xs}>
            {Object.entries(palette)
              .filter(([k]) => !k.startsWith('shadow'))
              .map(([k, v]) => (
                <View key={k} style={{ width: 84, gap: 2 }}>
                  <View style={{ height: 28, borderRadius: 6, backgroundColor: v, borderWidth: 1, borderColor: colors.hairline }} />
                  <Text variant="caption" tone="faint" numberOfLines={1} style={{ fontSize: 10 }}>
                    {k}
                  </Text>
                </View>
              ))}
          </Row>
        </Section>
      </Stack>
    </View>
  );
}

export default function UiGallery() {
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <ScrollView horizontal={false} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      <SchemeOverride.Provider value="light">
        <Column scheme="light" />
      </SchemeOverride.Provider>
      <SchemeOverride.Provider value="dark">
        <Column scheme="dark" />
      </SchemeOverride.Provider>
    </ScrollView>
  );
}
