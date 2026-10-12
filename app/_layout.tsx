/**
 * AuthGate + 화면 모드·언어. 로그인 → 온보딩 → 메인 순서로 보호 라우트를 연다.
 * 클레임(onboarded)이 바뀌면 guard 가 바뀌고 expo-router 가 알아서 이동한다.
 */

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useLocale } from '@/i18n';
import { startSessionListener, useSession } from '@/store/session';
import { loadFonts } from '@/ui/fonts';
import { KeyboardRoot } from '@/ui/keyboard';
import { ToastHost } from '@/ui/primitives';
import { fontFamily, useColors, useScheme } from '@/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
loadFonts();

export default function RootLayout() {
  const status = useSession((s) => s.status);
  const claims = useSession((s) => s.claims);
  const scheme = useScheme();
  const colors = useColors();
  const locale = useLocale();

  useEffect(() => {
    startSessionListener();
  }, []);

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync().catch(() => undefined);
  }, [status]);

  // 네이티브 루트 배경 (화면 전환 사이·키보드 뒤에 비치는 색)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => undefined);
  }, [colors.bg]);

  // 웹: 스크린리더·번역기가 쓰는 lang, 스크롤 끝에 비치는 배경색, 기본 글꼴
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    document.documentElement.lang = locale;
    document.documentElement.style.colorScheme = scheme;
    document.body.style.backgroundColor = colors.bg;
    document.body.style.fontFamily = fontFamily;
  }, [locale, scheme, colors.bg]);

  const navTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.bg,
        card: colors.surface,
        text: colors.text,
        border: colors.hairline,
      },
    };
  }, [scheme, colors]);

  // 세션을 확인하기 전에는 가드를 판단하지 않는다. 그래야 새로고침·딥링크(/profile/settings 등)가 그 자리에 머문다
  if (status === 'loading') return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  const signedIn = status === 'signedIn' && !claims.banned;
  const onboarded = signedIn && claims.onboarded === true;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={navTheme}>
        <SafeAreaProvider style={{ backgroundColor: colors.bg }}>
          <KeyboardRoot>
            <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
              <Stack.Screen name="index" />
              <Stack.Protected guard={!signedIn}>
                <Stack.Screen name="(auth)" />
              </Stack.Protected>
              <Stack.Protected guard={signedIn && !onboarded}>
                <Stack.Screen name="onboarding" />
              </Stack.Protected>
              <Stack.Protected guard={onboarded}>
                <Stack.Screen name="(main)" />
              </Stack.Protected>
            </Stack>
            <ToastHost />
          </KeyboardRoot>
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
