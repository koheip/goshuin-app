import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Image, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Pressable } from '@/components/Pressable';
import type { BlessingId } from '@/avatar/catalog';
import { KAMI_CATALOG_CARD_ILLUSTRATIONS } from '@/avatar/images';
import { DreamyBackground, Sparkle } from '@/components/ui';
import { KamiLoadingScreen } from '@/components/KamiLoadingScreen';
import { getJourneyStats, listVisitedShrines, type JourneyStats, type ShrineCatalogEntry } from '@/db/repo';
import { KAMI, type Kami } from '@/kami/catalog';
import { lineageOf, LINEAGES } from '@/lineage/catalog';
import { KAMI_BACKGROUNDS } from '@/lineage/images';
import { colors, fonts, glow, radius } from '@/theme';

type Filter = 'all' | 'found' | 'locked';
type Catalog = 'kami' | 'shrine';


export default function KamiScreen() {
  const db = useSQLiteContext();
  const [stats, setStats] = useState<JourneyStats | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [catalog, setCatalog] = useState<Catalog>('kami');
  const [shrines, setShrines] = useState<ShrineCatalogEntry[]>([]);
  // 神社図鑑の「神さま図鑑で見る」から、その神さまを開いた状態で来る
  const { open } = useLocalSearchParams<{ open?: string }>();

  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([getJourneyStats(db), listVisitedShrines(db)]).then(([value, visited]) => {
      if (!active) return;
      setStats(value);
      setShrines(visited);
      if (open) {
        const kami = KAMI.find((item) => item.id === open);
        setCatalog('kami');
        if (kami && value.visitCount >= kami.threshold) router.push({ pathname: '/kami/[id]', params: { id: kami.id } });
        router.setParams({ open: undefined });
      }
    });
    return () => { active = false; };
  }, [db, open]));

  const shrinesByLineage = useMemo(() => {
    const result = new Map<string, ShrineCatalogEntry[]>();
    for (const shrine of shrines) {
      const lineage = lineageOf(shrine);
      if (lineage) result.set(lineage.id, [...(result.get(lineage.id) ?? []), shrine]);
    }
    return result;
  }, [shrines]);

  const visits = stats?.visitCount ?? 0;
  const foundCount = KAMI.filter((kami) => visits >= kami.threshold).length;
  const data = useMemo(() => KAMI.filter((kami) => {
    const found = visits >= kami.threshold;
    return filter === 'all' || (filter === 'found' ? found : !found);
  }), [filter, visits]);


  function openDetail(kami: Kami) {
    // 鍵のかかったカードも、押したら理由を伝える（何も起きないと、壊れているように見える）
    if (visits < kami.threshold) {
      Alert.alert('まだ出会っていない神さまです', `あと ${kami.threshold - visits} 回の参拝を記録すると出会えます。`);
      return;
    }
    router.push({ pathname: '/kami/[id]', params: { id: kami.id } });
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <DreamyBackground />
      {stats === null && <KamiLoadingScreen variant="loading" message="神さまとのご縁をたどっています…" />}
      <View style={styles.catalogSwitch} accessibilityRole="tablist">
        {([['kami', '神さま', 'sparkles-outline'], ['shrine', '神社', 'book-outline']] as const).map(([value, label, icon]) => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: catalog === value }} onPress={() => setCatalog(value)} style={[styles.catalogTab, catalog === value && styles.catalogTabActive]}><Ionicons name={icon} size={16} color={catalog === value ? '#FFFFFF' : colors.violet} /><Text style={[styles.catalogTabText, catalog === value && styles.catalogTabTextActive]}>{label}</Text></Pressable>)}
      </View>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>{catalog === 'kami' ? 'KAMI COLLECTION' : 'SHRINE ENCYCLOPEDIA'}</Text>
          <View style={styles.titleRow}><Text style={styles.title}>{catalog === 'kami' ? '神さま図鑑' : '神社図鑑'}</Text><Sparkle size={18} /></View>
          <Text style={styles.sub}>{catalog === 'kami' ? 'めぐるほど、神さまとのご縁がひらきます' : '神社のなりたちや、神話とのつながりを知ろう'}</Text>
        </View>
        {catalog === 'kami' && <View style={styles.count}><Text style={styles.countValue}>{foundCount}</Text><Text style={styles.countLabel}>{`/ ${KAMI.length}`}</Text></View>}
      </View>

      {catalog === 'kami' && <View style={styles.filters} accessibilityRole="tablist">
        {([['all', 'すべて'], ['found', '出会った'], ['locked', '未発見']] as const).map(([value, label]) => (
          <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.filterActive]}>
            <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>}

      <View style={styles.utilities}>
        <Pressable accessibilityRole="button" onPress={() => router.push('/avatar')} style={styles.utility}><Ionicons name="person-outline" size={18} color={colors.accent} /><Text style={styles.utilityText}>おとも</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/reminder')} style={styles.utility}><Ionicons name="notifications-outline" size={18} color={colors.accent} /><Text style={styles.utilityText}>リマインダー</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/backup')} style={styles.utility}><Ionicons name="cloud-upload-outline" size={18} color={colors.accent} /><Text style={styles.utilityText}>データ</Text></Pressable>
      </View>

      {catalog === 'kami' ? <FlatList
        key="kami-catalog-grid"
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
            <Pressable accessibilityRole="button" accessibilityLabel={found ? `${item.name}。${item.blessing}。詳しく見る` : `未発見の神さま。あと${remaining}回の参拝`} onPress={() => openDetail(item)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
              <KamiPortrait kamiId={item.id} locked={!found} />
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
      /> : <FlatList
        key="lineage-list"
        data={LINEAGES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lineageList}
        ListFooterComponent={<Text style={styles.lineageNote}>全国の神社の多くは、大きな神社（総本社）から神さまを分けてお祀りしています。系統を知ると、近所の小さな神社のなりたちも見えてきます。</Text>}
        renderItem={({ item }) => {
          const visited = shrinesByLineage.get(item.id) ?? [];
          return (
            <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}。御祭神は${item.deity}。詳しく見る`} onPress={() => router.push({ pathname: '/lineage/[id]', params: { id: item.id } })} style={({ pressed }) => [styles.lineageCard, pressed && styles.pressed]}>
              <ImageBackground source={KAMI_BACKGROUNDS[item.kamiId]} resizeMode="cover" style={styles.lineageImage} imageStyle={styles.lineageImageInner}>
                <LinearGradient colors={['rgba(20,13,45,0)', 'rgba(20,13,45,.85)']} style={StyleSheet.absoluteFill} />
                <View style={styles.lineageMythState}><Ionicons name={visited.length > 0 ? 'lock-open' : 'lock-closed'} size={11} color="#FFFFFF" /><Text style={styles.lineageMythStateText}>{visited.length > 0 ? '神話 解放' : '神話 未解放'}</Text></View>
                <Text style={styles.lineageName}>{item.name}</Text>
              </ImageBackground>
              <View style={styles.lineageBody}>
                <Text style={styles.lineageDeity} numberOfLines={1}>御祭神　{item.deity}</Text>
                <Text style={styles.lineageSummary} numberOfLines={2}>{item.summary}</Text>
                <Text style={[styles.lineageVisited, visited.length === 0 && styles.muted]} numberOfLines={1}>{visited.length > 0 ? `参拝した神社：${visited.map((shrine) => shrine.name).join('、')}` : '参拝すると神話の章がひらきます'}</Text>
              </View>
            </Pressable>
          );
        }}
      />}

    </SafeAreaView>
  );
}

function KamiPortrait({ kamiId, locked }: { kamiId: BlessingId; locked: boolean }) {
  return (
    <View style={styles.portrait}>
      {!locked && <Image key={`${kamiId}-catalog-v5`} source={KAMI_CATALOG_CARD_ILLUSTRATIONS[kamiId]} resizeMode="cover" style={styles.catalogPortraitImage} fadeDuration={0} />}
      <LinearGradient colors={['transparent', 'rgba(45,29,82,0.16)']} style={StyleSheet.absoluteFill} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  catalogSwitch: { marginHorizontal: 20, marginTop: 10, padding: 4, flexDirection: 'row', borderRadius: 22, backgroundColor: 'rgba(255,255,255,.74)', borderWidth: 1, borderColor: colors.line },
  catalogTab: { flex: 1, minHeight: 40, borderRadius: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, catalogTabActive: { backgroundColor: colors.violet, boxShadow: glow.soft }, catalogTabText: { fontFamily: fonts.bold, fontSize: 12, color: colors.inkSoft }, catalogTabTextActive: { color: '#FFFFFF' },
  headerText: { flex: 1 },
  lineageList: { paddingHorizontal: 16, paddingBottom: 28, gap: 12 },
  lineageCard: { overflow: 'hidden', borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,.9)', borderWidth: 1, borderColor: colors.line, boxShadow: glow.soft },
  lineageImage: { height: 120, justifyContent: 'flex-end', padding: 14 }, lineageImageInner: { opacity: .95 },
  lineageMythState: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 9, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 12, backgroundColor: 'rgba(23,15,52,.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,.5)' },
  lineageMythStateText: { fontFamily: fonts.bold, fontSize: 9, color: '#FFFFFF' },
  lineageName: { fontFamily: fonts.displayHeavy, fontSize: 22, color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,.6)', textShadowRadius: 6 },
  lineageBody: { padding: 14, gap: 5 },
  lineageDeity: { fontFamily: fonts.bold, fontSize: 11, color: colors.violet },
  lineageSummary: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 19, color: colors.inkSoft },
  lineageVisited: { fontFamily: fonts.bold, fontSize: 11, color: colors.accent },
  lineageNote: { marginTop: 4, paddingHorizontal: 4, fontFamily: fonts.regular, fontSize: 11, lineHeight: 18, color: colors.muted },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 2, color: colors.violet },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, title: { fontFamily: fonts.displayHeavy, fontSize: 29, color: colors.ink },
  sub: { marginTop: 2, fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  count: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 13, paddingVertical: 7, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.72)' },
  countValue: { fontFamily: fonts.displayHeavy, fontSize: 19, color: colors.accent }, countLabel: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted },
  filters: { marginHorizontal: 20, marginBottom: 13, padding: 4, flexDirection: 'row', borderRadius: 22, backgroundColor: 'rgba(255,255,255,.68)', borderWidth: 1, borderColor: colors.line },
  utilities: { marginHorizontal: 20, marginBottom: 12, flexDirection: 'row', gap: 8 },
  utility: { flex: 1, minHeight: 42, paddingHorizontal: 7, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,.72)', borderWidth: 1, borderColor: colors.line },
  utilityText: { fontFamily: fonts.bold, fontSize: 9, color: colors.inkSoft },
  filter: { flex: 1, minHeight: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, filterActive: { backgroundColor: colors.accent, boxShadow: glow.soft },
  filterText: { fontFamily: fonts.bold, fontSize: 12, color: colors.muted }, filterTextActive: { color: '#FFFFFF' },
  grid: { paddingHorizontal: 16, paddingBottom: 28, gap: 12 }, row: { gap: 12 },
  card: { flex: 1, overflow: 'hidden', borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,.86)', borderWidth: 1, borderColor: colors.line, boxShadow: glow.soft }, pressed: { transform: [{ scale: .98 }], opacity: .85 },
  portrait: { width: '100%', aspectRatio: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9EEFF' },
  catalogPortraitImage: { width: '100%', height: '100%', transform: [{ scale: 1.18 }] },
  lock: { position: 'absolute', top: 56, alignSelf: 'center', width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(90,66,127,.72)', alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 11, gap: 3 }, name: { fontFamily: fonts.display, fontSize: 15, color: colors.ink }, muted: { color: colors.muted },
  reading: { minHeight: 17, fontFamily: fonts.regular, fontSize: 10, color: colors.muted }, blessing: { fontFamily: fonts.bold, fontSize: 10, color: colors.accentOnTint },
  progress: { height: 4, marginTop: 4, overflow: 'hidden', borderRadius: 2, backgroundColor: colors.track }, progressFill: { height: '100%', borderRadius: 2, backgroundColor: colors.accent },
  empty: { padding: 32, textAlign: 'center', fontFamily: fonts.regular, color: colors.muted },
});
