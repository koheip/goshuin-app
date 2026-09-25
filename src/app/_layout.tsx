import {
  MPLUSRounded1c_500Medium,
  MPLUSRounded1c_700Bold,
  MPLUSRounded1c_800ExtraBold,
  MPLUSRounded1c_900Black,
  useFonts,
} from '@expo-google-fonts/m-plus-rounded-1c';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';

import { KamiLoadingScreen } from '@/components/KamiLoadingScreen';
import { migrateDbIfNeeded } from '@/db/migrate';
import { colors, fonts } from '@/theme';

SplashScreen.preventAutoHideAsync();

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
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.paper },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontFamily: fonts.display, color: colors.ink },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.paper },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="record" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="goshuin/[id]" options={{ title: '御朱印' }} />
        <Stack.Screen name="goshuin/edit/[id]" options={{ title: '記録を編集' }} />
        <Stack.Screen name="backup" options={{ title: 'バックアップ' }} />
        <Stack.Screen name="books/index" options={{ title: '御朱印帳' }} />
        <Stack.Screen name="books/[id]" options={{ title: '帳の名前と並び順' }} />
      </Stack>
      </SQLiteProvider>
      {showLoading && <KamiLoadingScreen onFinish={finishLoading} />}
    </>
  );
}
