import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Tabs } from 'expo-router';
import { StyleSheet, View, type ColorValue } from 'react-native';

import { colors, fonts, glow } from '@/theme';

function ScrollTabIcon({ color }: { color: ColorValue }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.scrollIcon}>
      <View style={[styles.scrollPaper, { borderColor: color }]}> 
        <View style={[styles.scrollWriting, { backgroundColor: color }]} />
        <View style={[styles.scrollWriting, styles.scrollWritingShort, { backgroundColor: color }]} />
      </View>
      <View style={[styles.scrollCurl, styles.scrollCurlLeft, { borderColor: color, backgroundColor: colors.surface }]}>
        <View style={[styles.scrollSpiral, { borderColor: color }]} />
      </View>
      <View style={[styles.scrollCurl, styles.scrollCurlRight, { borderColor: color, backgroundColor: colors.surface }]}>
        <View style={[styles.scrollSpiral, { borderColor: color }]} />
      </View>
    </View>
  );
}

function ToriiTabIcon({ color }: { color: ColorValue }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.toriiIcon}>
      <View style={[styles.toriiKasagi, { backgroundColor: color }]} />
      <View style={[styles.toriiShimaki, { backgroundColor: color }]} />
      <View style={[styles.toriiNuki, { backgroundColor: color }]} />
      <View style={[styles.toriiPillar, styles.toriiPillarLeft, { backgroundColor: color }]} />
      <View style={[styles.toriiPillar, styles.toriiPillarRight, { backgroundColor: color }]} />
      <View style={[styles.toriiBase, styles.toriiBaseLeft, { backgroundColor: color }]} />
      <View style={[styles.toriiBase, styles.toriiBaseRight, { backgroundColor: color }]} />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          boxShadow: glow.soft,
        },
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.paper },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'ホーム',
          tabBarIcon: ({ color }) => <ToriiTabIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: '地図',
          tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="kami"
        options={{
          title: '図鑑',
          tabBarIcon: ({ color }) => <ScrollTabIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="book"
        options={{
          title: '御朱印帳',
          tabBarIcon: ({ color, size }) => <Ionicons name="book" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="avatar"
        options={{
          title: 'ME',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          href: null,
        }}
        // 記録はタブではなく、全画面のモーダルで3ステップを進める
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/record');
          },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scrollIcon: { position: 'relative', width: 29, height: 22, alignItems: 'center', justifyContent: 'center' },
  scrollPaper: { width: 23, height: 14, alignItems: 'center', justifyContent: 'center', gap: 3, borderWidth: 1.7, borderRadius: 2, backgroundColor: colors.surface },
  scrollWriting: { width: 10, height: 1.5, borderRadius: 1 },
  scrollWritingShort: { width: 7 },
  scrollCurl: { position: 'absolute', top: 2, width: 7, height: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.7, borderRadius: 5 },
  scrollCurlLeft: { left: 0 },
  scrollCurlRight: { right: 0 },
  scrollSpiral: { width: 3, height: 7, borderWidth: 1.2, borderRadius: 2 },
  toriiIcon: { position: 'relative', width: 28, height: 25 },
  toriiKasagi: { position: 'absolute', top: 1, left: 0, width: 28, height: 3.5, borderRadius: 2 },
  toriiShimaki: { position: 'absolute', top: 5, left: 3, width: 22, height: 2.5, borderRadius: 1.5 },
  toriiNuki: { position: 'absolute', top: 10, left: 4, width: 20, height: 3, borderRadius: 1 },
  toriiPillar: { position: 'absolute', top: 7, width: 3.5, height: 16, borderRadius: 1.5 },
  toriiPillarLeft: { left: 6.5, transform: [{ rotate: '3deg' }] },
  toriiPillarRight: { right: 6.5, transform: [{ rotate: '-3deg' }] },
  toriiBase: { position: 'absolute', bottom: 0, width: 8, height: 2.5, borderRadius: 1.5 },
  toriiBaseLeft: { left: 4 },
  toriiBaseRight: { right: 4 },
});
