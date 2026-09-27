import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlaceMark } from '@/components/shrine';
import { Sparkle } from '@/components/ui';
import { listVisitedShrines, type ShrineCatalogEntry } from '@/db/repo';
import { getLineage, lineageOf } from '@/lineage/catalog';
import { KAMI_BACKGROUNDS } from '@/lineage/images';
import { formatDot } from '@/lib/dates';
import { colors, fonts, glow, radius } from '@/theme';

// 神社図鑑の1ページ。系統ごとに、なりたち・役割・神話とのつながりを伝える
export default function LineageScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lineage = getLineage(id);
  // null は読み込み中。読み込む前に鍵のかかった表示がちらつかないようにする
  const [visited, setVisited] = useState<ShrineCatalogEntry[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      listVisitedShrines(db).then((rows) => {
        if (active) setVisited(rows.filter((shrine) => lineageOf(shrine)?.id === id));
      });
      return () => {
        active = false;
      };
    }, [db, id]),
  );

  if (!lineage) {
    return (
      <View style={[styles.screen, styles.missing, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>このページは見つかりませんでした</Text>
      </View>
    );
  }

  const findNearby = () => router.navigate({ pathname: '/map', params: { q: lineage.searchQuery } });

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ImageBackground source={KAMI_BACKGROUNDS[lineage.kamiId]} resizeMode="cover" style={styles.hero}>
          <LinearGradient colors={['rgba(20,13,45,.08)', 'rgba(20,13,45,.25)', 'rgba(20,13,45,.92)']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
          <View style={[styles.heroTop, { paddingTop: Math.max(insets.top, 12) }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="戻る" hitSlop={10} onPress={() => router.back()} style={styles.roundButton}>
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.kicker}>SHRINE LINEAGE</Text>
          </View>
          <View style={styles.heading}>
            <Text style={styles.aliases}>{lineage.aliases}</Text>
            <Text style={styles.name}>{lineage.name}</Text>
            <View style={styles.chip}>
              <Sparkle size={12} color="#FFFFFF" />
              <Text style={styles.chipText}>{lineage.blessings.join('・')}</Text>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.body}>
          <View style={styles.facts}>
            <View style={styles.fact}>
              <Text style={styles.factLabel}>御祭神</Text>
              <Text style={styles.factValue}>{lineage.deity}</Text>
            </View>
            <View style={[styles.fact, styles.factBorder]}>
              <Text style={styles.factLabel}>総本社</Text>
              <Text style={styles.factValue}>{lineage.headShrine}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.navigate({ pathname: '/kami', params: { open: lineage.kamiId } })}
              style={({ pressed }) => [styles.kamiLink, pressed && styles.pressed]}
            >
              <Ionicons name="sparkles-outline" size={16} color={colors.accent} />
              <Text style={styles.kamiLinkText}>神さま図鑑で「{lineage.kamiName}」を見る</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.accent} />
            </Pressable>
          </View>

          <Text style={styles.summary}>{lineage.summary}</Text>

          <Section icon="time-outline" kicker="ORIGIN" title="なりたち" paragraphs={lineage.origin} />
          <Section icon="help-circle-outline" kicker="ROLE" title="何のための神社？" paragraphs={lineage.purpose} />
          {visited === null ? null : visited.length > 0 ? (
            <Section icon="book-outline" kicker="MYTH / 神話" title={lineage.mythTitle} paragraphs={lineage.myth} badge="参拝して解放" />
          ) : (
            <View style={[styles.section, styles.locked]}>
              <View style={styles.sectionHead}>
                <View style={[styles.sectionIcon, styles.lockedIcon]}>
                  <Ionicons name="lock-closed" size={19} color="#FFFFFF" />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.sectionKicker}>MYTH / 神話</Text>
                  <Text style={styles.sectionHeading}>神話とのつながり</Text>
                </View>
              </View>
              <View style={styles.rule} />
              <Text style={styles.paragraph}>
                {lineage.name}に参拝すると、「{lineage.mythTitle}」の物語が読めるようになります。
              </Text>
              <Pressable accessibilityRole="button" onPress={findNearby} style={({ pressed }) => [styles.lockedButton, pressed && styles.pressed]}>
                <Ionicons name="search" size={16} color="#FFFFFF" />
                <Text style={styles.lockedButtonText}>近くの{lineage.name}を探す</Text>
              </Pressable>
            </View>
          )}

          <Text style={styles.sectionTitle}>あなたが参拝した{lineage.name}</Text>
          {visited && visited.length > 0 ? (
            <View style={styles.visited}>
              {visited.map((shrine) => (
                <Pressable
                  key={shrine.id}
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/shrine/[id]', params: { id: shrine.id } })}
                  style={({ pressed }) => [styles.visitedRow, pressed && styles.pressed]}
                >
                  <PlaceMark kind={shrine.kind} size={28} />
                  <View style={styles.flex}>
                    <Text style={styles.visitedName} numberOfLines={1}>
                      {shrine.name}
                    </Text>
                    <Text style={styles.visitedMeta}>
                      参拝 {shrine.visitCount}回{shrine.lastVisitedOn ? ` · 最終 ${formatDot(shrine.lastVisitedOn)}` : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={colors.violet} />
                </Pressable>
              ))}
            </View>
          ) : visited && (
            <Pressable accessibilityRole="button" onPress={findNearby} style={({ pressed }) => [styles.search, pressed && styles.pressed]}>
              <Text style={styles.searchText}>まだ参拝していません。近くの{lineage.name}を探してみましょう</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.accent} />
            </Pressable>
          )}

          <Text style={styles.note}>
            ※ 『古事記』『日本書紀』や各総本社に伝わる由緒を、読みやすく要約しています。伝承には異説があり、同じ名前でも由来の異なる神社があります。
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ icon, kicker, title, paragraphs, badge }: {
  icon: keyof typeof Ionicons.glyphMap;
  kicker: string;
  title: string;
  paragraphs: string[];
  badge?: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={20} color={colors.violet} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.sectionKicker}>{kicker}</Text>
          <Text style={styles.sectionHeading}>{title}</Text>
        </View>
        {badge && (
          <View style={styles.badge}>
            <Ionicons name="lock-open" size={11} color="#FFFFFF" />
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <View style={styles.rule} />
      {paragraphs.map((paragraph, index) => (
        <Text key={index} style={styles.paragraph}>
          {paragraph}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { paddingBottom: 40 },
  missing: { alignItems: 'center', justifyContent: 'center' },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  hero: { height: 460, justifyContent: 'flex-end', overflow: 'hidden', backgroundColor: colors.violet },
  heroTop: {
    position: 'absolute',
    zIndex: 2,
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roundButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23,15,52,.44)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.55)',
  },
  kicker: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 1.6,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,.7)',
    textShadowRadius: 5,
  },
  heading: { padding: 22, paddingBottom: 52 },
  aliases: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1, color: 'rgba(255,255,255,.8)' },
  name: {
    marginTop: 2,
    fontFamily: fonts.displayHeavy,
    fontSize: 31,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,.65)',
    textShadowRadius: 8,
  },
  chip: {
    alignSelf: 'flex-start',
    marginTop: 7,
    paddingHorizontal: 11,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.45)',
  },
  chipText: { fontFamily: fonts.bold, fontSize: 10, color: '#FFFFFF' },
  body: { padding: 20, gap: 14 },
  facts: {
    marginTop: -36,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
    boxShadow: glow.soft,
    overflow: 'hidden',
  },
  fact: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  factBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  factLabel: { width: 52, fontFamily: fonts.bold, fontSize: 11, color: colors.violet },
  factValue: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  kamiLink: {
    minHeight: 46,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.accentTint,
  },
  kamiLinkText: { flex: 1, fontFamily: fonts.bold, fontSize: 12, color: colors.accentOnTint },
  summary: { marginTop: 4, fontFamily: fonts.display, fontSize: 17, lineHeight: 27, color: colors.ink },
  section: {
    padding: 16,
    gap: 11,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,.78)',
    borderWidth: 1,
    borderColor: colors.lineStrong,
    boxShadow: glow.soft,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentTint,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  sectionKicker: { fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.4, color: colors.violet },
  sectionHeading: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },
  locked: { borderStyle: 'dashed' },
  lockedIcon: { backgroundColor: colors.violet, borderColor: colors.violet },
  lockedButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 22,
    backgroundColor: colors.accent,
    boxShadow: glow.pink,
  },
  lockedButtonText: { fontFamily: fonts.bold, fontSize: 13, color: '#FFFFFF' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 10,
    backgroundColor: colors.accent,
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 9, color: '#FFFFFF' },
  rule: { width: 44, height: 2, borderRadius: 1, backgroundColor: colors.accent },
  paragraph: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 23, color: colors.inkSoft },
  sectionTitle: { marginTop: 8, fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  visited: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  visitedRow: {
    minHeight: 60,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  visitedName: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  visitedMeta: { marginTop: 2, fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  search: {
    minHeight: 50,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
  },
  searchText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft },
  note: { marginTop: 8, fontFamily: fonts.regular, fontSize: 10, lineHeight: 17, color: colors.muted },
  pressed: { opacity: 0.75 },
});
