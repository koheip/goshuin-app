import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlaceMark } from '@/components/shrine';
import { BackButton } from '@/components/ui';
import { getShrineCatalogEntry, listShrineVisits, setShrineFavorite, type ShrineCatalogEntry } from '@/db/repo';
import { PLACE_KIND_LABEL, type VisitEntry } from '@/db/types';
import { lineageOf } from '@/lineage/catalog';
import { formatDot } from '@/lib/dates';
import { imageUri } from '@/lib/images';
import { openInGoogleMaps } from '@/lib/maps';
import { colors, fonts, glow, gradients, radius } from '@/theme';

// 神社・お寺の1ページ。そこでの参拝の思い出をまとめて見る
export default function ShrineDetailScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [shrine, setShrine] = useState<ShrineCatalogEntry | null | undefined>(undefined);
  const [visits, setVisits] = useState<VisitEntry[]>([]);

  // 編集や参拝の削除から戻ったときにも読み直す
  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getShrineCatalogEntry(db, id), listShrineVisits(db, id)]).then(([row, rows]) => {
        if (!active) return;
        setShrine(row);
        setVisits(rows);
      });
      return () => {
        active = false;
      };
    }, [db, id]),
  );

  const back = <BackButton />;

  if (shrine === undefined) return <View style={styles.screen} />;
  if (shrine === null) {
    // 最後の参拝を消すと一覧から外れる
    return (
      <View style={[styles.screen, styles.missing, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>この神社・お寺の参拝記録はありません</Text>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.primary}>
          <Text style={styles.primaryText}>戻る</Text>
        </Pressable>
      </View>
    );
  }

  const current = shrine;
  const kindLabel = PLACE_KIND_LABEL[current.kind];
  const location = current.prefecture ?? current.address;
  const lineage = lineageOf(current);
  const openEdit = () => router.push({ pathname: '/shrine/edit/[id]', params: { id } });
  const favorite = current.favoritedAt !== null;

  // 先に表示を切り替え、保存に失敗したら元に戻す
  async function toggleFavorite() {
    const next = favorite ? null : new Date().toISOString();
    setShrine({ ...current, favoritedAt: next });
    try {
      await setShrineFavorite(db, current.id, next !== null);
    } catch {
      setShrine(current);
      Alert.alert('お気に入りを保存できませんでした');
    }
  }

  async function openMap() {
    try {
      await openInGoogleMaps(current);
    } catch {
      Alert.alert('地図を開けませんでした', 'Google マップまたはブラウザを確認してください。');
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          {current.latestImageFile ? (
            <Image source={{ uri: imageUri(current.latestImageFile) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <LinearGradient colors={gradients.sky} style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient colors={['rgba(38,25,75,.08)', 'rgba(38,25,75,.3)', 'rgba(38,25,75,.92)']} style={StyleSheet.absoluteFill} />
          {!current.latestImageFile && (
            <View style={styles.heroMark}>
              <PlaceMark kind={current.kind} size={96} />
            </View>
          )}
          <View style={[styles.heroTop, { paddingTop: Math.max(insets.top, 12) }]}>
            {back}
            <View style={styles.heroActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={favorite ? `${current.name}をお気に入りから外す` : `${current.name}をお気に入りにする`}
                accessibilityState={{ selected: favorite }}
                hitSlop={10}
                onPress={toggleFavorite}
                style={({ pressed }) => [styles.favoriteButton, favorite && styles.favoriteButtonActive, pressed && styles.pressed]}
              >
                <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={20} color={favorite ? colors.accent : '#FFFFFF'} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${current.name}の情報を編集`}
                hitSlop={10}
                onPress={openEdit}
                style={styles.editButton}
              >
                <Ionicons name="create-outline" size={17} color="#FFFFFF" />
                <Text style={styles.editText}>編集</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.heading}>
            <Text style={styles.reading}>{current.kana ?? (current.kind === 'temple' ? 'TEMPLE' : 'SHRINE')}</Text>
            <Text style={styles.name}>{current.name}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={location ? `${location}。Google マップで開く` : '所在地を登録する'}
              onPress={location ? openMap : openEdit}
              style={styles.locationChip}
            >
              <Ionicons name="location" size={13} color="#FFFFFF" />
              <Text style={styles.locationText}>{location || '所在地を登録する'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.summary}>
            <View style={styles.summaryIcon}>
              <Ionicons name="footsteps" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.flex}>
              <Text style={styles.summaryLabel}>{current.visitCount}回、この{kindLabel}へ参拝しました</Text>
              <Text style={styles.summaryText}>最終参拝 {current.lastVisitedOn ? formatDot(current.lastVisitedOn) : '—'}</Text>
            </View>
          </View>

          <Pressable accessibilityRole="button" onPress={openMap} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
            <Ionicons name="navigate-outline" size={18} color={colors.ink} />
            <Text style={styles.secondaryText}>Google マップで開く</Text>
          </Pressable>

          {lineage ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${lineage.name}について詳しく見る`}
              onPress={() => router.push({ pathname: '/lineage/[id]', params: { id: lineage.id } })}
              style={({ pressed }) => [styles.about, pressed && styles.pressed]}
            >
              <View style={styles.aboutHead}>
                <View style={styles.aboutIcon}>
                  <Ionicons name="book-outline" size={19} color={colors.violet} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.aboutKicker}>この{kindLabel}について</Text>
                  <Text style={styles.aboutTitle}>{lineage.name}の仲間です</Text>
                </View>
              </View>
              <Text style={styles.aboutText}>
                {lineage.summary}御祭神は{lineage.deity}、総本社は{lineage.headShrine}です。
              </Text>
              <View style={styles.aboutLink}>
                <Text style={styles.aboutLinkText}>なりたちや神話を読む</Text>
                <Ionicons name="arrow-forward" size={15} color={colors.accent} />
              </View>
            </Pressable>
          ) : current.kind === 'shrine' ? (
            <Pressable accessibilityRole="button" onPress={openEdit} style={({ pressed }) => [styles.aboutHint, pressed && styles.pressed]}>
              <Ionicons name="book-outline" size={17} color={colors.violet} />
              <Text style={styles.aboutHintText}>「編集」で系統（稲荷・神明など）を選ぶと、この神社のなりたちや神話が読めます</Text>
            </Pressable>
          ) : null}

          <Text style={styles.sectionTitle}>参拝の記録</Text>
          <View style={styles.visits}>
            {visits.map((visit) => (
              <Pressable
                key={visit.id}
                accessibilityRole="button"
                accessibilityLabel={`${formatDot(visit.visitedOn)}の参拝を開く`}
                onPress={() => router.push({ pathname: '/visit/[id]', params: { id: visit.id } })}
                style={({ pressed }) => [styles.visitCard, pressed && styles.pressed]}
              >
                {visit.latestImageFile ? (
                  <Image source={{ uri: imageUri(visit.latestImageFile) }} style={styles.visitImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.visitImage, styles.visitIcon]}>
                    <PlaceMark kind={current.kind} size={30} />
                  </View>
                )}
                <View style={styles.flex}>
                  <View style={styles.visitTop}>
                    <Text style={styles.visitDate}>
                      {formatDot(visit.visitedOn)}
                      {visit.weather ? ` · ${visit.weather}` : ''}
                    </Text>
                    {visit.goshuinCount > 0 && (
                      <View style={styles.badge}>
                        <Ionicons name="image-outline" size={11} color={colors.accent} />
                        <Text style={styles.badgeText}>御朱印 {visit.goshuinCount}</Text>
                      </View>
                    )}
                    {visit.photoCount > 0 && (
                      <View style={styles.badge}>
                        <Ionicons name="camera-outline" size={11} color={colors.accent} />
                        <Text style={styles.badgeText}>写真 {visit.photoCount}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.visitMemo} numberOfLines={2}>
                    {visit.memo || (visit.goshuinCount > 0 ? '御朱印と一緒に記録しました' : '日々の参拝を記録しました')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.violet} />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { paddingBottom: 40 },
  missing: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  hero: { height: 420, justifyContent: 'flex-end', overflow: 'hidden', backgroundColor: colors.violet },
  heroMark: { position: 'absolute', alignSelf: 'center', top: 140, opacity: 0.95 },
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
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  favoriteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(23,15,52,.44)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.55)',
  },
  favoriteButtonActive: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  editButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(23,15,52,.44)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.55)',
  },
  editText: { fontFamily: fonts.bold, fontSize: 12, color: '#FFFFFF' },
  heading: { padding: 22, paddingBottom: 52 },
  reading: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,.75)' },
  name: {
    marginTop: 2,
    fontFamily: fonts.displayHeavy,
    fontSize: 30,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,.65)',
    textShadowRadius: 8,
  },
  locationChip: {
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
  locationText: { fontFamily: fonts.bold, fontSize: 10, color: '#FFFFFF' },
  body: { padding: 20, gap: 14 },
  summary: {
    marginTop: -36,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
    boxShadow: glow.soft,
  },
  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  summaryLabel: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink },
  summaryText: { marginTop: 2, fontFamily: fonts.regular, fontSize: 10, color: colors.muted },
  secondary: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
  },
  secondaryText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  about: {
    padding: 16,
    gap: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,.86)',
    borderWidth: 1,
    borderColor: colors.lineStrong,
    boxShadow: glow.soft,
  },
  aboutHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  aboutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentTint,
  },
  aboutKicker: { fontFamily: fonts.bold, fontSize: 10, color: colors.violet },
  aboutTitle: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },
  aboutText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 22, color: colors.inkSoft },
  aboutLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  aboutLinkText: { fontFamily: fonts.bold, fontSize: 12, color: colors.accent },
  aboutHint: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
  },
  aboutHintText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, lineHeight: 19, color: colors.inkSoft },
  sectionTitle: { marginTop: 8, fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  visits: { gap: 10 },
  visitCard: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    boxShadow: glow.soft,
  },
  visitImage: { width: 56, height: 56, borderRadius: 14, backgroundColor: colors.track },
  visitIcon: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentTint },
  visitTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  visitDate: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 9,
    backgroundColor: colors.accentTint,
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 9, color: colors.accent },
  visitMemo: { marginTop: 4, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.inkSoft },
  primary: {
    minHeight: 46,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: colors.accent,
  },
  primaryText: { fontFamily: fonts.bold, fontSize: 13, color: '#FFFFFF' },
  pressed: { opacity: 0.75 },
});
