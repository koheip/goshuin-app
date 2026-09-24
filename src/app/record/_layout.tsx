import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import { Pressable } from 'react-native';

import { DraftProvider } from '@/record/draft';
import { colors, fonts } from '@/theme';

export default function RecordLayout() {
  return (
    <DraftProvider>
      <Stack
        screenOptions={{
          title: '参拝を記録',
          headerStyle: { backgroundColor: colors.paper },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontFamily: fonts.display, color: colors.ink },
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.paper },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerLeft: () => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="記録をやめる"
                hitSlop={12}
                onPress={() => router.back()}
              >
                <Ionicons name="close" size={26} color={colors.ink} />
              </Pressable>
            ),
          }}
        />
        <Stack.Screen name="photo" />
        <Stack.Screen name="memo" />
      </Stack>
    </DraftProvider>
  );
}
