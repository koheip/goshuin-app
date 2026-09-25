import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoshuinPage } from '@/components/GoshuinPage';
import { Sakura, Shimenawa, Torii } from '@/components/shrine';
import { Button, DreamyBackground, ScreenTitle, Sparkle } from '@/components/ui';
import { getBook, getCurrentBook, listBookEntries } from '@/db/repo';
import { GOSHUIN_KIND_LABEL, type Book, type GoshuinEntry } from '@/db/types';
import { formatDot } from '@/lib/dates';
import { imageUri } from '@/lib/images';
import { colors, fonts, glow, gradients, radius } from '@/theme';

type Mode = 'spread' | 'grid';
type Spread = { key: string; left?: GoshuinEntry; right?: GoshuinEntry };

const SIDE_PADDING = 16;
const COVER_PADDING = 10;
const GRID_COLUMNS = 2;

export default function BookScreen() {
  const db = useSQLiteContext();
  const { width: windowWidth } = useWindowDimensions();
  // 帳の一覧から選んだ帳。なければ記録中の帳を開く
  const { book: bookParam } = useLocalSearchParams<{ book?: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [entries, setEntries] = useState<GoshuinEntry[] | null>(null);
  const [mode, setMode] = useState<Mode>('grid');
  const [spreadIndex, setSpreadIndex] = useState(0);
  const listRef = useRef<FlatList<Spread>>(null);
  const prevCount = useRef<number | null>(null);
  const prevBookId = useRef<string | null>(null);
  const pendingScroll = useRef<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const current = (bookParam ? await getBook(db, bookParam) : null) ?? (await getCurrentBook(db));
        const rows = await listBookEntries(db, current.id);
        if (!active) return;
        if (prevBookId.current !== current.id) {
          prevBookId.current = current.id;
          prevCount.current = null;
        }
        setBook(current);
        setEntries(rows);
        // 最初の表示と、新しい御朱印が増えたときは最新の見開きを開く
        const lastSpread = Math.max(Math.ceil(rows.length / 2) - 1, 0);
        if (prevCount.current === null || rows.length > prevCount.current) {
          setSpreadIndex(lastSpread);
          pendingScroll.current = lastSpread;
        } else {
          setSpreadIndex((i) => Math.min(i, lastSpread));
        }
        prevCount.current = rows.length;
      })();
      return () => {
        active = false;
      };
    }, [db, bookParam]),
  );

  const spreads = useMemo<Spread[]>(() => {
    if (!entries) return [];
    const result: Spread[] = [];
    for (let i = 0; i < entries.length; i += 2) {
      result.push({ key: entries[i].id, left: entries[i], right: entries[i + 1] });
    }
    return result;
  }, [entries]);

  useEffect(() => {
    const index = pendingScroll.current;
    if (index === null || spreads.length === 0 || mode !== 'spread') return;
    pendingScroll.current = null;
    requestAnimationFrame(() => listRef.current?.scrollToIndex({ index, animated: false }));
  }, [spreads, mode]);

  const spreadWidth = windowWidth - SIDE_PADDING * 2;
  const pageWidth = (spreadWidth - COVER_PADDING * 2 - 2) / 2;
  const pageHeight = Math.round(pageWidth * 1.45);

  const openEntry = (entry: GoshuinEntry) => router.push(`/goshuin/${entry.id}`);

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setSpreadIndex(Math.round(e.nativeEvent.contentOffset.x / spreadWidth));
  }

  function goTo(index: number) {
    if (index < 0 || index >= spreads.length) return;
    setSpreadIndex(index);
    listRef.current?.scrollToIndex({ index, animated: true });
  }

  const current = spreads[spreadIndex];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <DreamyBackground />
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.tagline}>MY SACRED MEMORIES</Text>
          <View style={styles.titleRow}>
            <ScreenTitle>MY BOOK</ScreenTitle>
            <Text style={styles.titleHeart}>♡</Text>
            <Sparkle size={16} color={colors.accent} />
            <Sparkle size={10} color={colors.violet} style={styles.titleSparkleSmall} />
          </View>
        </View>
        <View style={styles.headerActions}>
          {book && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${book.name}。御朱印帳を切り替える`}
              onPress={() => router.push('/books')}
              style={({ pressed }) => [styles.bookPill, pressed && { backgroundColor: colors.track }]}
            >
              <LinearGradient colors={gradients.primary} style={styles.bookSwatch} />
              <Text style={styles.bookName} numberOfLines={1}>
                {book.name}
              </Text>
              <Ionicons name="chevron-down" size={14} color={colors.muted} />
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="バックアップ"
            hitSlop={6}
            onPress={() => router.push('/backup')}
            style={({ pressed }) => [styles.iconButton, pressed && { backgroundColor: colors.track }]}
          >
            <Ionicons name="cloud-upload-outline" size={20} color={colors.ink} />
          </Pressable>
        </View>
      </View>

      {entries === null ? null : entries.length === 0 ? (
        <View style={styles.empty}>
          <LinearGradient colors={gradients.cover} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.cover, { width: spreadWidth }]}>
            <Shimenawa width={spreadWidth - COVER_PADDING * 2} shide={5} style={styles.coverRope} />
            <View style={styles.spreadInner}>
              <GoshuinPage entry={undefined} side="left" width={pageWidth} height={pageHeight} />
              <GoshuinPage entry={undefined} side="right" width={pageWidth} height={pageHeight} />
            </View>
          </LinearGradient>
          <View style={styles.emptyMotif}>
            <Sakura size={18} style={styles.emptySakuraLeft} />
            <Torii size={72} />
            <Sakura size={14} color={colors.accent} style={styles.emptySakuraRight} />
          </View>
          <Text style={styles.emptyTitle}>まだ御朱印はありません</Text>
          <Text style={styles.emptyBody}>参拝して授かった御朱印を撮影すると、ここに一冊の帳面として綴じられます。</Text>
          <Button
            label="最初の参拝を記録する"
            onPress={() => router.push('/record')}
            icon={<Ionicons name="add" size={20} color="#FFFFFF" />}
            style={styles.emptyButton}
          />
        </View>
      ) : (
        <>
          <View style={styles.segment} accessibilityRole="tablist">
            {(['spread', 'grid'] as const).map((m) => (
              <Pressable
                key={m}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === m }}
                onPress={() => setMode(m)}
                style={[styles.segmentItem, mode === m && styles.segmentItemActive]}
              >
                <Text style={[styles.segmentLabel, mode === m && styles.segmentLabelActive]}>
                  {m === 'spread' ? '見開き' : '御朱印帳'}
                </Text>
              </Pressable>
            ))}
          </View>

          {mode === 'spread' ? (
            <View>
              <FlatList
                ref={listRef}
                data={spreads}
                keyExtractor={(s) => s.key}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onScrollEnd}
                getItemLayout={(_, index) => ({ length: spreadWidth, offset: spreadWidth * index, index })}
                initialScrollIndex={Math.min(spreadIndex, Math.max(spreads.length - 1, 0))}
                style={{ marginHorizontal: SIDE_PADDING }}
                renderItem={({ item }) => (
                  <LinearGradient colors={gradients.cover} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.cover, { width: spreadWidth }]}>
                    <Shimenawa width={spreadWidth - COVER_PADDING * 2} shide={5} style={styles.coverRope} />
                    <View style={styles.spreadInner}>
                      <GoshuinPage
                        entry={item.left}
                        side="left"
                        width={pageWidth}
                        height={pageHeight}
                        onPress={openEntry}
                      />
                      <GoshuinPage
                        entry={item.right}
                        side="right"
                        width={pageWidth}
                        height={pageHeight}
                        onPress={openEntry}
                      />
                    </View>
                  </LinearGradient>
                )}
              />

              <View style={styles.captions}>
                <Caption entry={current?.left} align="left" />
                <Caption entry={current?.right} align="right" />
              </View>

              <View style={styles.pager}>
                <PagerButton
                  icon="chevron-back"
                  label="前の見開き"
                  disabled={spreadIndex === 0}
                  onPress={() => goTo(spreadIndex - 1)}
                />
                <Text style={styles.pagerText}>
                  見開き {spreadIndex + 1} / {spreads.length}
                </Text>
                <PagerButton
                  icon="chevron-forward"
                  label="次の見開き"
                  disabled={spreadIndex >= spreads.length - 1}
                  onPress={() => goTo(spreadIndex + 1)}
                />
              </View>
            </View>
          ) : (
            <FlatList
              key="grid"
              data={entries}
              keyExtractor={(e) => e.id}
              numColumns={GRID_COLUMNS}
              contentContainerStyle={styles.gridContent}
              columnWrapperStyle={styles.gridRow}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${item.shrineName}、${formatDot(item.visitedOn)}の御朱印を開く`}
                  onPress={() => openEntry(item)}
                  style={[styles.gridItem, { width: (windowWidth - SIDE_PADDING * 2 - 12) / GRID_COLUMNS }]}
                >
                  <View style={styles.gridThumb}>
                    <Image source={{ uri: imageUri(item.imageFile) }} style={styles.gridImage} resizeMode="contain" />
                  </View>
                  <Text style={styles.gridName} numberOfLines={1}>
                    {item.shrineName}
                  </Text>
                  <Text style={styles.gridDate}>{formatDot(item.visitedOn)}</Text>
                </Pressable>
              )}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

function Caption({ entry, align }: { entry?: GoshuinEntry; align: 'left' | 'right' }) {
  if (!entry) return <View style={styles.caption} />;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/goshuin/${entry.id}`)}
      style={[styles.caption, { alignItems: align === 'left' ? 'flex-start' : 'flex-end' }]}
    >
      <Text style={styles.captionName} numberOfLines={1}>
        {entry.shrineName}
      </Text>
      <Text style={styles.captionMeta}>
        {formatDot(entry.visitedOn)} · {GOSHUIN_KIND_LABEL[entry.kind]}
      </Text>
    </Pressable>
  );
}

function PagerButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: 'chevron-back' | 'chevron-forward';
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.pagerButton, disabled && { opacity: 0.35 }]}
    >
      <Ionicons name={icon} size={18} color={colors.accent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 2 },
  titleHeart: { marginTop: 2, fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 34, color: colors.accent },
  titleSparkleSmall: { marginTop: 14 },
  titleTorii: { marginTop: 8, marginRight: 6 },
  coverRope: { marginBottom: 6 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerText: { flexShrink: 1, gap: 4 },
  headerActions: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
    boxShadow: glow.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 2, color: colors.violet },
  bookPill: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
    boxShadow: glow.soft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  bookSwatch: { width: 14, height: 14, borderRadius: 7 },
  bookName: { flexShrink: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.ink },
  segment: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 4,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1.5,
    borderColor: colors.line,
    flexDirection: 'row',
  },
  segmentItem: { flex: 1, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  segmentItemActive: { backgroundColor: colors.accentTint, boxShadow: glow.soft },
  segmentLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  segmentLabelActive: { color: colors.accentOnTint, fontFamily: fonts.bold },
  cover: {
    padding: COVER_PADDING,
    borderRadius: radius.lg,
    boxShadow: glow.pink,
  },
  spreadInner: { flexDirection: 'row', gap: 2, backgroundColor: colors.line, borderRadius: 10 },
  captions: { marginTop: 14, marginHorizontal: 20, flexDirection: 'row', gap: 12 },
  caption: { flex: 1, gap: 2, minHeight: 44 },
  captionName: { fontSize: 14, fontFamily: fonts.bold, color: colors.ink },
  captionMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  pager: {
    marginTop: 12,
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pagerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
    boxShadow: glow.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagerText: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  gridContent: { paddingHorizontal: SIDE_PADDING, paddingBottom: 24, gap: 12 },
  gridRow: { gap: 12 },
  gridItem: { gap: 4, padding: 8, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,.76)', borderWidth: 1, borderColor: colors.line, boxShadow: glow.soft },
  gridThumb: {
    aspectRatio: 1 / 1.12,
    borderRadius: radius.sm,
    boxShadow: glow.soft,
    backgroundColor: colors.page,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridImage: { width: '96%', height: '96%' },
  gridName: { fontSize: 13, fontFamily: fonts.bold, color: colors.ink },
  gridDate: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  empty: { alignItems: 'center', paddingHorizontal: SIDE_PADDING, paddingTop: 8, gap: 12 },
  emptyMotif: { marginTop: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  emptySakuraLeft: { marginBottom: 36 },
  emptySakuraRight: { marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontFamily: fonts.bold, color: colors.ink },
  emptyBody: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.muted, textAlign: 'center', paddingHorizontal: 12 },
  emptyButton: { marginTop: 8, alignSelf: 'stretch', borderRadius: radius.md },
});
