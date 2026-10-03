import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ImageBackground, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KAMI_CATALOG_ILLUSTRATIONS } from '@/avatar/images';
import { BackButton, Sparkle } from '@/components/ui';
import { getJourneyStats } from '@/db/repo';
import { KAMI } from '@/kami/catalog';
import { colors, fonts, glow } from '@/theme';

// 神さま図鑑の詳しい画面。iOS では Modal が表示されないまま残ってタッチを止めたので、普通の画面にしている
export default function KamiDetailScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const kami = KAMI.find((item) => item.id === id);
  const [visits, setVisits] = useState<number | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    getJourneyStats(db).then((stats) => {
      if (!active) return;
      // まだ出会っていない神さまは開かない
      if (!kami || stats.visitCount < kami.threshold) router.back();
      else setVisits(stats.visitCount);
    });
    return () => { active = false; };
  }, [db, kami]));

  if (!kami || visits === null) return <View style={styles.detailScreen} />;

  return <View style={styles.detailScreen}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent}>
      <ImageBackground source={KAMI_CATALOG_ILLUSTRATIONS[kami.id]} resizeMode="cover" style={styles.detailHero} imageStyle={styles.detailHeroImage}>
        <LinearGradient colors={['rgba(20,13,45,.08)', 'rgba(20,13,45,.2)', 'rgba(20,13,45,.92)']} locations={[0, .48, 1]} style={StyleSheet.absoluteFill} />
        <View style={[styles.detailSafe, { paddingTop: Math.max(insets.top, 12) }]}><View style={styles.detailTop}><BackButton label="図鑑へ戻る" onPress={() => router.back()} /><Text style={styles.detailNumber}>KAMI No.{String(kami.cell + 1).padStart(2, '0')}</Text></View></View>
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

const styles = StyleSheet.create({
  detailScreen: { flex: 1, backgroundColor: colors.paper }, detailContent: { paddingBottom: 40 }, detailHero: { height: 520, justifyContent: 'flex-end', overflow: 'hidden' }, detailHeroImage: { opacity: .96 }, detailSafe: { position: 'absolute', zIndex: 5, elevation: 5, left: 0, right: 0, top: 0 }, detailTop: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, detailNumber: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.6, color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,.7)', textShadowRadius: 5 }, detailHeading: { padding: 22 }, detailReading: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,.75)' }, detailName: { fontFamily: fonts.displayHeavy, fontSize: 31, color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,.65)', textShadowRadius: 8 }, detailBlessing: { alignSelf: 'flex-start', marginTop: 7, paddingHorizontal: 11, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,.45)' }, detailBlessingText: { fontFamily: fonts.bold, fontSize: 10, color: '#FFFFFF' },
  detailBody: { padding: 20, gap: 13 }, discovery: { marginTop: -36, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line, boxShadow: glow.soft }, discoveryIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent }, discoveryLabel: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink }, discoveryText: { marginTop: 2, fontFamily: fonts.regular, fontSize: 9, color: colors.muted }, detailTitle: { marginTop: 8, fontFamily: fonts.display, fontSize: 20, lineHeight: 29, color: colors.ink }, detailStory: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 22, color: colors.inkSoft }, mythCard: { marginVertical: 4, padding: 16, gap: 11, overflow: 'hidden', borderRadius: 22, backgroundColor: 'rgba(255,255,255,.78)', borderWidth: 1, borderColor: colors.lineStrong, boxShadow: glow.soft }, mythHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 }, mythIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentTint, borderWidth: 1, borderColor: colors.lineStrong }, mythHeading: { flex: 1, gap: 2 }, mythKicker: { fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.4, color: colors.violet }, mythTitle: { fontFamily: fonts.display, fontSize: 17, color: colors.ink }, mythRule: { width: 44, height: 2, borderRadius: 1, backgroundColor: colors.accent }, mythParagraph: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 22, color: colors.inkSoft }, infoLabel: { fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.2, color: colors.violet }, symbols: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, symbol: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 15, backgroundColor: colors.accentTint, borderWidth: 1, borderColor: colors.lineStrong }, symbolText: { fontFamily: fonts.bold, fontSize: 10, color: colors.accentOnTint }, infoCard: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 19, backgroundColor: 'rgba(255,255,255,.8)', borderWidth: 1, borderColor: colors.line }, infoIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentTint }, infoCopy: { flex: 1, gap: 3 }, infoValue: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink }, note: { fontFamily: fonts.regular, fontSize: 9, lineHeight: 16, color: colors.muted },
});
