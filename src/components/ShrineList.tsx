import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { PlaceMark } from '@/components/shrine';
import type { ShrineCatalogEntry } from '@/db/repo';
import { formatDot } from '@/lib/dates';
import { imageUri } from '@/lib/images';
import { colors, fonts, glow, radius } from '@/theme';

// 記録の「神社ごと」：参拝した神社・お寺を、よく参拝する順に並べる。同じ回数なら最近参拝した順
export function ShrineList({ shrines }: { shrines: ShrineCatalogEntry[] }) {
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const favoriteCount = shrines.filter((s) => s.favoritedAt !== null).length;
  const sorted = useMemo(
    // 受け取る配列は最近参拝した順なので、安定ソートで回数だけ並べ替えれば同数の中の順は保たれる
    () => [...shrines].sort((a, b) => b.visitCount - a.visitCount),
    [shrines],
  );
  const data = onlyFavorites ? sorted.filter((s) => s.favoritedAt !== null) : sorted;

  return (
    <FlatList
      key="shrine-list"
      data={data}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        shrines.length > 0 ? (
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: onlyFavorites }}
            onPress={() => setOnlyFavorites((v) => !v)}
            style={[styles.filter, onlyFavorites && styles.filterActive]}
          >
            <Ionicons name={onlyFavorites ? 'heart' : 'heart-outline'} size={14} color={onlyFavorites ? '#FFFFFF' : colors.accent} />
            <Text style={[styles.filterText, onlyFavorites && styles.filterTextActive]}>お気に入り {favoriteCount}</Text>
          </Pressable>
        ) : null
      }
      ListEmptyComponent={
        onlyFavorites ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="heart-outline" size={36} color={colors.accent} />
            </View>
            <Text style={styles.emptyTitle}>お気に入りの神社はまだありません</Text>
            <Text style={styles.emptyText}>神社のページ右上のハートを押すと、ここに加わります。</Text>
          </View>
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <PlaceMark kind="shrine" size={40} />
            </View>
            <Text style={styles.emptyTitle}>参拝した神社がここに並びます</Text>
            <Text style={styles.emptyText}>神社を探して参拝を記録すると、自動でここに加わります。</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/map')} style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>神社を探す</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        )
      }
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${item.name}。${item.favoritedAt !== null ? 'お気に入り。' : ''}参拝${item.visitCount}回`}
          onPress={() => router.push({ pathname: '/shrine/[id]', params: { id: item.id } })}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          {item.latestImageFile ? (
            <Image source={{ uri: imageUri(item.latestImageFile) }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <PlaceMark kind={item.kind} size={40} />
            </View>
          )}
          <View style={styles.body}>
            <View style={styles.top}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              {item.favoritedAt !== null && (
                <Ionicons name="heart" size={14} color={colors.accent} accessibilityLabel="お気に入り" />
              )}
              <View style={styles.badge}>
                <Ionicons name="footsteps" size={11} color={colors.accent} />
                <Text style={styles.badgeText}>{item.visitCount}回</Text>
              </View>
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              {item.prefecture ?? item.address ?? '所在地未登録'}
            </Text>
            <Text style={styles.date}>最終参拝 {item.lastVisitedOn ? formatDot(item.lastVisitedOn) : '—'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color={colors.violet} />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  // 下に「参拝を記録」ボタンが重なるので、最後の行まで見えるよう余白をとる
  list: { paddingHorizontal: 16, paddingBottom: 90, gap: 10 },
  filter: {
    alignSelf: 'flex-start',
    minHeight: 34,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  filterActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterText: { fontFamily: fonts.bold, fontSize: 12, color: colors.accentOnTint },
  filterTextActive: { color: '#FFFFFF' },
  card: {
    minHeight: 96,
    padding: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,.86)',
    borderWidth: 1,
    borderColor: colors.line,
    boxShadow: glow.soft,
  },
  image: { width: 76, height: 76, borderRadius: 16, backgroundColor: colors.track },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentTint },
  body: { flex: 1, gap: 5 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flex: 1, fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 10,
    backgroundColor: colors.accentTint,
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 9, color: colors.accentOnTint },
  meta: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  date: { fontFamily: fonts.bold, fontSize: 10, color: colors.violet },
  empty: { paddingHorizontal: 28, paddingTop: 34, alignItems: 'center', gap: 10 },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentTint,
  },
  emptyTitle: { marginTop: 5, fontFamily: fonts.display, fontSize: 17, color: colors.ink, textAlign: 'center' },
  emptyText: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 19, color: colors.muted, textAlign: 'center' },
  emptyButton: {
    marginTop: 8,
    minHeight: 46,
    paddingHorizontal: 20,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.accent,
  },
  emptyButtonText: { fontFamily: fonts.bold, fontSize: 12, color: '#FFFFFF' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});
