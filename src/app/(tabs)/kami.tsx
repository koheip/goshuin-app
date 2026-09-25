import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { Animated, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DreamyBackground, Sparkle } from '@/components/ui';
import { getJourneyStats, type JourneyStats } from '@/db/repo';
import { colors, fonts, glow, gradients, radius } from '@/theme';

const sprite = require('../../../assets/kami-catalog-sprite.png');
type Filter = 'all' | 'found' | 'locked';
type Kami = { id: string; name: string; reading: string; blessing: string; threshold: number; cell: 0 | 1 | 2 | 3 };

const KAMI: Kami[] = [
  { id: 'amaterasu', name: 'アマテラス', reading: '天照大御神', blessing: '光と導き', threshold: 0, cell: 0 },
  { id: 'susanoo', name: 'スサノオ', reading: '須佐之男命', blessing: '厄除けと勇気', threshold: 2, cell: 1 },
  { id: 'okuninushi', name: 'オオクニヌシ', reading: '大国主命', blessing: 'ご縁むすび', threshold: 5, cell: 2 },
  { id: 'inari', name: 'お稲荷さま', reading: '宇迦之御魂神', blessing: '実りと商売', threshold: 10, cell: 3 },
];

export default function KamiScreen() {
  const db = useSQLiteContext();
  const [stats, setStats] = useState<JourneyStats | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [celebrating, setCelebrating] = useState<Kami | null>(null);
  const [celebration] = useState(() => new Animated.Value(0));
  const celebrationScale = useMemo(
    () => celebration.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }),
    [celebration],
  );

  useFocusEffect(useCallback(() => {
    let active = true;
    getJourneyStats(db).then((value) => active && setStats(value));
    return () => { active = false; };
  }, [db]));

  const visits = stats?.visitCount ?? 0;
  const foundCount = KAMI.filter((kami) => visits >= kami.threshold).length;
  const data = useMemo(() => KAMI.filter((kami) => {
    const found = visits >= kami.threshold;
    return filter === 'all' || (filter === 'found' ? found : !found);
  }), [filter, visits]);

  function celebrate(kami: Kami) {
    if (visits < kami.threshold) return;
    setCelebrating(kami);
    celebration.setValue(0);
    Animated.sequence([
      Animated.spring(celebration, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(celebration, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(({ finished }) => finished && setCelebrating(null));
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <DreamyBackground />
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>KAMI COLLECTION</Text>
          <View style={styles.titleRow}><Text style={styles.title}>神さま図鑑</Text><Sparkle size={18} /></View>
          <Text style={styles.sub}>めぐるほど、神さまとのご縁がひらきます</Text>
        </View>
        <View style={styles.count}><Text style={styles.countValue}>{foundCount}</Text><Text style={styles.countLabel}>/ {KAMI.length}</Text></View>
      </View>

      <View style={styles.filters} accessibilityRole="tablist">
        {([['all', 'すべて'], ['found', '出会った'], ['locked', '未発見']] as const).map(([value, label]) => (
          <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.filterActive]}>
            <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={<Text style={styles.empty}>この条件の神さまはまだいません</Text>}
        renderItem={({ item }) => {
          const found = visits >= item.threshold;
          const remaining = Math.max(item.threshold - visits, 0);
          return (
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: !found }} accessibilityLabel={found ? `${item.name}。${item.blessing}` : `${item.name}は未発見。あと${remaining}回の参拝`} onPress={() => celebrate(item)} style={({ pressed }) => [styles.card, pressed && found && styles.pressed]}>
              <KamiPortrait cell={item.cell} locked={!found} />
              {!found && <View style={styles.lock}><Ionicons name="lock-closed" size={23} color="#FFFFFF" /></View>}
              <View style={styles.cardBody}>
                <Text style={[styles.name, !found && styles.muted]}>{found ? item.name : '???'}</Text>
                <Text style={styles.reading}>{found ? item.reading : `あと ${remaining} 回の参拝`}</Text>
                <View style={styles.progress}><View style={[styles.progressFill, { width: `${Math.min(visits / Math.max(item.threshold, 1), 1) * 100}%` }]} /></View>
                <Text style={styles.blessing}>{found ? item.blessing : `${visits}/${item.threshold}`}</Text>
              </View>
            </Pressable>
          );
        }}
      />

      {celebrating && (
        <Animated.View pointerEvents="none" style={[styles.celebration, { opacity: celebration, transform: [{ scale: celebrationScale }] }] }>
          <LinearGradient colors={gradients.cover} style={styles.celebrationGlow}>
            <Sparkle size={28} color={colors.accent} />
            <Text style={styles.found}>KAMI FOUND!</Text>
            <Text style={styles.foundName}>{celebrating.name}</Text>
          </LinearGradient>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

function KamiPortrait({ cell, locked }: { cell: 0 | 1 | 2 | 3; locked: boolean }) {
  const top = cell > 1 ? '-100%' : '0%';
  const left = cell % 2 ? '-100%' : '0%';
  return (
    <View style={styles.portrait}>
      <Image source={sprite} resizeMode="stretch" style={[styles.sprite, { top, left }, locked && styles.spriteLocked]} />
      <LinearGradient colors={['transparent', 'rgba(45,29,82,0.16)']} style={StyleSheet.absoluteFill} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 2, color: colors.violet },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, title: { fontFamily: fonts.displayHeavy, fontSize: 29, color: colors.ink },
  sub: { marginTop: 2, fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  count: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 13, paddingVertical: 7, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.72)' },
  countValue: { fontFamily: fonts.displayHeavy, fontSize: 19, color: colors.accent }, countLabel: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted },
  filters: { marginHorizontal: 20, marginBottom: 13, padding: 4, flexDirection: 'row', borderRadius: 22, backgroundColor: 'rgba(255,255,255,.68)', borderWidth: 1, borderColor: colors.line },
  filter: { flex: 1, minHeight: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, filterActive: { backgroundColor: colors.accent, boxShadow: glow.soft },
  filterText: { fontFamily: fonts.bold, fontSize: 12, color: colors.muted }, filterTextActive: { color: '#FFFFFF' },
  grid: { paddingHorizontal: 16, paddingBottom: 28, gap: 12 }, row: { gap: 12 },
  card: { flex: 1, overflow: 'hidden', borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,.86)', borderWidth: 1, borderColor: colors.line, boxShadow: glow.soft }, pressed: { transform: [{ scale: .98 }], opacity: .85 },
  portrait: { width: '100%', aspectRatio: 1.08, overflow: 'hidden', backgroundColor: colors.track }, sprite: { position: 'absolute', width: '200%', height: '200%' }, spriteLocked: { opacity: .25, tintColor: colors.inkSoft },
  lock: { position: 'absolute', top: 56, alignSelf: 'center', width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(90,66,127,.72)', alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 11, gap: 3 }, name: { fontFamily: fonts.display, fontSize: 15, color: colors.ink }, muted: { color: colors.muted },
  reading: { minHeight: 17, fontFamily: fonts.regular, fontSize: 10, color: colors.muted }, blessing: { fontFamily: fonts.bold, fontSize: 10, color: colors.accentOnTint },
  progress: { height: 4, marginTop: 4, overflow: 'hidden', borderRadius: 2, backgroundColor: colors.track }, progressFill: { height: '100%', borderRadius: 2, backgroundColor: colors.accent },
  empty: { padding: 32, textAlign: 'center', fontFamily: fonts.regular, color: colors.muted },
  celebration: { position: 'absolute', left: 36, right: 36, top: '34%', zIndex: 20 }, celebrationGlow: { padding: 28, alignItems: 'center', borderRadius: radius.lg, borderWidth: 2, borderColor: '#FFFFFF', boxShadow: glow.pink },
  found: { marginTop: 4, fontFamily: fonts.displayHeavy, fontSize: 24, letterSpacing: 2, color: colors.accent }, foundName: { marginTop: 5, fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
});
