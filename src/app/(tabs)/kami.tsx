import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Image, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DreamyBackground, Sparkle } from '@/components/ui';
import { KamiLoadingScreen } from '@/components/KamiLoadingScreen';
import { getJourneyStats, type JourneyStats } from '@/db/repo';
import { colors, fonts, glow, radius } from '@/theme';

const sprite = require('../../../assets/kami-catalog-sprite.png');
type Filter = 'all' | 'found' | 'locked';
type Kami = { id: 'amaterasu' | 'susanoo' | 'okuninushi' | 'inari'; name: string; reading: string; blessing: string; threshold: number; cell: 0 | 1 | 2 | 3; title: string; story: string; mythTitle: string; myth: string[]; symbols: string[]; worship: string };

const backgrounds = {
  amaterasu: require('../../../assets/blessing-amaterasu.png'),
  susanoo: require('../../../assets/blessing-susanoo.png'),
  okuninushi: require('../../../assets/blessing-okuninushi.png'),
  inari: require('../../../assets/blessing-inari.png'),
};

const KAMI: Kami[] = [
  { id: 'amaterasu', name: 'アマテラス', reading: '天照大御神', blessing: '光と導き', threshold: 0, cell: 0, title: '日の光で世界を照らす神さま', story: '神々の世界を治める日の神として伝えられ、伊勢神宮の皇大神宮（内宮）にお祀りされています。八咫鏡は天照大御神の御神体として大切にされています。', mythTitle: '天の岩戸', myth: ['弟神スサノオの振る舞いを悲しんだ天照大御神は、天の岩戸にお隠れになります。太陽の神が姿を消すと、高天原も地上も暗闇に包まれました。', '八百万の神々は岩戸の前で祭りを行い、天宇受売命が舞い、鏡を差し出します。にぎわいを不思議に思った大御神が戸を開くと、天手力男神が外へお迎えし、世界に再び光が戻りました。'], symbols: ['太陽', '八咫鏡', '光'], worship: '伊勢神宮・神明神社' },
  { id: 'susanoo', name: 'スサノオ', reading: '須佐之男命', blessing: '厄除けと勇気', threshold: 2, cell: 1, title: '荒ぶる力で災いを祓う神さま', story: '天照大御神の弟神とされ、八岐大蛇を退治した神話で知られます。力強さと厄除け・災難除けの神さまとして、各地で篤く信仰されています。', mythTitle: '八俣の大蛇', myth: ['高天原を離れ出雲へ降りたスサノオは、八俣の大蛇に娘を奪われ続けていた老夫婦と櫛稲田姫に出会います。', '強い酒を用意して大蛇を酔わせ、眠ったところを退治しました。その尾から現れた剣は、のちに草薙剣と呼ばれ、天照大御神へ献上されたと伝えられます。'], symbols: ['大海原', '神剣', '八重垣'], worship: '八坂神社・須賀神社' },
  { id: 'okuninushi', name: 'オオクニヌシ', reading: '大国主命', blessing: 'ご縁むすび', threshold: 5, cell: 2, title: 'あらゆる幸せのご縁を結ぶ神さま', story: '国づくりを進め、農耕・漁業・医薬など暮らしに必要な知恵を授けたと伝えられます。縁結びは男女だけでなく、人々を取り巻くあらゆる繋がりを指します。', mythTitle: '因幡の白兎と国づくり', myth: ['傷ついた白兎に出会ったオオクニヌシは、真水で体を洗い、蒲の花粉の上で休むよう教えます。兎は元の姿を取り戻し、その優しさに報いました。', 'その後、多くの試練を越え、少名毘古那神と力を合わせて国づくりを進めました。人や生き物を慈しむ姿は、医薬や縁結びの信仰にもつながっています。'], symbols: ['白兎', '縁結び', '国づくり'], worship: '出雲大社・大神神社' },
  { id: 'inari', name: 'お稲荷さま', reading: '宇迦之御魂神', blessing: '実りと商売', threshold: 10, cell: 3, title: '日々の実りと繁栄を見守る神さま', story: '五穀豊穣を司る神さまとして信仰され、今日では商売繁昌・産業興隆・家内安全など、暮らしと仕事を広く見守る神さまとして親しまれています。', mythTitle: '稲荷山の白鳥伝承', myth: ['『山城国風土記』逸文には、伊呂具秦公が餅を的にして矢を射ると、餅が白鳥となって山へ飛び、その峰に稲が生じたため社を建てたという伝承があります。', '伏見稲荷大社では、稲荷大神が稲荷山に鎮座したのは和銅4年（711）の初午の日と伝えられます。稲の実りを象徴する信仰は、衣食住と繁栄を見守る稲荷信仰へ広がりました。'], symbols: ['稲穂', '白狐', '朱の鳥居'], worship: '伏見稲荷大社・稲荷神社' },
];

export default function KamiScreen() {
  const db = useSQLiteContext();
  const [stats, setStats] = useState<JourneyStats | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Kami | null>(null);

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

  function openDetail(kami: Kami) {
    if (visits < kami.threshold) return;
    setSelected(kami);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <DreamyBackground />
      {stats === null && <KamiLoadingScreen variant="loading" message="神さまとのご縁をたどっています…" />}
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
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: !found }} accessibilityLabel={found ? `${item.name}。${item.blessing}。詳しく見る` : `${item.name}は未発見。あと${remaining}回の参拝`} onPress={() => openDetail(item)} style={({ pressed }) => [styles.card, pressed && found && styles.pressed]}>
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

      <Modal visible={selected !== null} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setSelected(null)}>
        {selected && <KamiDetail kami={selected} visits={visits} onClose={() => setSelected(null)} />}
      </Modal>
    </SafeAreaView>
  );
}

function KamiDetail({ kami, visits, onClose }: { kami: Kami; visits: number; onClose: () => void }) {
  const insets = useSafeAreaInsets();

  return <View style={styles.detailScreen}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent}>
      <ImageBackground source={backgrounds[kami.id]} resizeMode="cover" style={styles.detailHero} imageStyle={styles.detailHeroImage}>
        <LinearGradient colors={['rgba(20,13,45,.08)', 'rgba(20,13,45,.2)', 'rgba(20,13,45,.92)']} locations={[0, .48, 1]} style={StyleSheet.absoluteFill} />
        <View style={[styles.detailSafe, { paddingTop: Math.max(insets.top, 12) }]}><View style={styles.detailTop}><Pressable accessibilityRole="button" accessibilityLabel="図鑑へ戻る" hitSlop={10} onPress={onClose} style={styles.detailClose}><Ionicons name="chevron-back" size={24} color="#FFFFFF" /></Pressable><Text style={styles.detailNumber}>KAMI No.{String(kami.cell + 1).padStart(2, '0')}</Text></View></View>
        <View style={styles.detailPortrait}><KamiPortrait cell={kami.cell} locked={false} /></View>
        <View style={styles.detailHeading}><Text style={styles.detailReading}>{kami.reading}</Text><Text style={styles.detailName}>{kami.name}</Text><View style={styles.detailBlessing}><Sparkle size={13} color="#FFFFFF" /><Text style={styles.detailBlessingText}>{kami.blessing}</Text></View></View>
      </ImageBackground>

      <View style={styles.detailBody}>
        <View style={styles.discovery}><View style={styles.discoveryIcon}><Ionicons name="heart" size={18} color="#FFFFFF" /></View><View><Text style={styles.discoveryLabel}>ご縁が結ばれました</Text><Text style={styles.discoveryText}>{visits}回の参拝を記録しています</Text></View></View>
        <Text style={styles.detailTitle}>{kami.title}</Text>
        <Text style={styles.detailStory}>{kami.story}</Text>
        <View style={styles.mythCard}>
          <View style={styles.mythHeader}>
            <View style={styles.mythIcon}><Ionicons name="book-outline" size={20} color={colors.violet} /></View>
            <View style={styles.mythHeading}><Text style={styles.mythKicker}>MYTH / 神話</Text><Text style={styles.mythTitle}>{kami.mythTitle}</Text></View>
          </View>
          <View style={styles.mythRule} />
          {kami.myth.map((paragraph, index) => <Text key={`${kami.id}-myth-${index}`} style={styles.mythParagraph}>{paragraph}</Text>)}
        </View>
        <Text style={styles.infoLabel}>SYMBOLS / 象徴</Text>
        <View style={styles.symbols}>{kami.symbols.map((symbol) => <View key={symbol} style={styles.symbol}><Text style={styles.symbolText}>{symbol}</Text></View>)}</View>
        <View style={styles.infoCard}><View style={styles.infoIcon}><Ionicons name="location-outline" size={19} color={colors.accent} /></View><View style={styles.infoCopy}><Text style={styles.infoLabel}>ゆかりの神社</Text><Text style={styles.infoValue}>{kami.worship}</Text></View></View>
        <Text style={styles.note}>※ 『古事記』『日本書紀』や各神社に伝わる神話・鎮座伝承を、読みやすく要約しています。伝承には異説があります。</Text>
      </View>
    </ScrollView>
  </View>;
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
  detailScreen: { flex: 1, backgroundColor: colors.paper }, detailContent: { paddingBottom: 40 }, detailHero: { height: 520, justifyContent: 'flex-end', overflow: 'hidden' }, detailHeroImage: { opacity: .92 }, detailSafe: { position: 'absolute', zIndex: 5, elevation: 5, left: 0, right: 0, top: 0 }, detailTop: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, detailClose: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,15,52,.44)', borderWidth: 1, borderColor: 'rgba(255,255,255,.55)' }, detailNumber: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.6, color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,.7)', textShadowRadius: 5 }, detailPortrait: { position: 'absolute', width: 230, height: 230, borderRadius: 115, overflow: 'hidden', alignSelf: 'center', top: 92, borderWidth: 3, borderColor: 'rgba(255,255,255,.82)', boxShadow: glow.pink }, detailHeading: { padding: 22 }, detailReading: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,.75)' }, detailName: { fontFamily: fonts.displayHeavy, fontSize: 31, color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,.65)', textShadowRadius: 8 }, detailBlessing: { alignSelf: 'flex-start', marginTop: 7, paddingHorizontal: 11, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,.45)' }, detailBlessingText: { fontFamily: fonts.bold, fontSize: 10, color: '#FFFFFF' },
  detailBody: { padding: 20, gap: 13 }, discovery: { marginTop: -36, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line, boxShadow: glow.soft }, discoveryIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent }, discoveryLabel: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink }, discoveryText: { marginTop: 2, fontFamily: fonts.regular, fontSize: 9, color: colors.muted }, detailTitle: { marginTop: 8, fontFamily: fonts.display, fontSize: 20, lineHeight: 29, color: colors.ink }, detailStory: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 22, color: colors.inkSoft }, mythCard: { marginVertical: 4, padding: 16, gap: 11, overflow: 'hidden', borderRadius: 22, backgroundColor: 'rgba(255,255,255,.78)', borderWidth: 1, borderColor: colors.lineStrong, boxShadow: glow.soft }, mythHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 }, mythIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentTint, borderWidth: 1, borderColor: colors.lineStrong }, mythHeading: { flex: 1, gap: 2 }, mythKicker: { fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.4, color: colors.violet }, mythTitle: { fontFamily: fonts.display, fontSize: 17, color: colors.ink }, mythRule: { width: 44, height: 2, borderRadius: 1, backgroundColor: colors.accent }, mythParagraph: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 22, color: colors.inkSoft }, infoLabel: { fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.2, color: colors.violet }, symbols: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, symbol: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 15, backgroundColor: colors.accentTint, borderWidth: 1, borderColor: colors.lineStrong }, symbolText: { fontFamily: fonts.bold, fontSize: 10, color: colors.accentOnTint }, infoCard: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 19, backgroundColor: 'rgba(255,255,255,.8)', borderWidth: 1, borderColor: colors.line }, infoIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentTint }, infoCopy: { flex: 1, gap: 3 }, infoValue: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink }, note: { fontFamily: fonts.regular, fontSize: 9, lineHeight: 16, color: colors.muted },
});
