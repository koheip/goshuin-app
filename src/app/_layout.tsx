import {
  MPLUSRounded1c_500Medium,
  MPLUSRounded1c_700Bold,
  MPLUSRounded1c_800ExtraBold,
  MPLUSRounded1c_900Black,
  useFonts,
} from '@expo-google-fonts/m-plus-rounded-1c';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';

import { KamiLoadingScreen } from '@/components/KamiLoadingScreen';
import { TutorialProvider } from '@/components/TutorialProvider';
import { HeaderBackButton } from '@/components/ui';
import { migrateDbIfNeeded } from '@/db/migrate';
import { loadSoundSettings } from '@/lib/feedback';
import { useVisitReminderTap } from '@/notifications/reminder';
import { colors, fonts } from '@/theme';

SplashScreen.preventAutoHideAsync();

// 画面のスタックができてから、通知からの移動を受け付ける
function ReminderTapObserver() {
  useVisitReminderTap();
  return null;
}

// 起動時に「効果音」と「音量」の設定を読み、ボタンの音に反映する
function TapSoundSetting() {
  const db = useSQLiteContext();
  useEffect(() => {
    loadSoundSettings(db).catch(() => {});
  }, [db]);
  return null;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    MPLUSRounded1c_500Medium,
    MPLUSRounded1c_700Bold,
    MPLUSRounded1c_800ExtraBold,
    MPLUSRounded1c_900Black,
  });
  const [showLoading, setShowLoading] = useState(true);
  const finishLoading = useCallback(() => setShowLoading(false), []);

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  // フォントの読み込みに失敗しても、標準の書体で起動を続ける
  if (!loaded && !error) return null;

  return (
    <>
      <SQLiteProvider databaseName="goshuin.db" onInit={migrateDbIfNeeded}>
      <TutorialProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.paper },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontFamily: fonts.display, color: colors.ink },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.paper },
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: ({ canGoBack }) => (canGoBack ? <HeaderBackButton /> : null),
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="record" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="goshuin/[id]" options={{ title: '御朱印' }} />
        <Stack.Screen name="goshuin/edit/[id]" options={{ title: '記録を編集' }} />
        <Stack.Screen name="visit/[id]" options={{ title: '参拝の記録' }} />
        <Stack.Screen name="visit/edit/[id]" options={{ title: '記録を編集' }} />
        <Stack.Screen name="shrine/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="shrine/edit/[id]" options={{ title: '神社・お寺を編集' }} />
        <Stack.Screen name="lineage/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="kami/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="backup" options={{ title: 'バックアップ' }} />
        <Stack.Screen name="nearby" options={{ title: '近くの神社・お寺' }} />
        <Stack.Screen name="reminder" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="terms" options={{ title: '利用規約' }} />
        <Stack.Screen name="privacy" options={{ title: 'プライバシーポリシー' }} />
        <Stack.Screen name="licenses" options={{ title: 'ライセンス' }} />
      </Stack>
      <ReminderTapObserver />
      <TapSoundSetting />
      </TutorialProvider>
      </SQLiteProvider>
      {showLoading && <KamiLoadingScreen onFinish={finishLoading} />}
    </>
  );
}
