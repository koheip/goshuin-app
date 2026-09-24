import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Shimenawa, Torii } from '@/components/shrine';
import { Button } from '@/components/ui';
import { deleteGoshuin, getEntry } from '@/db/repo';
import { GOSHUIN_KIND_LABEL, type GoshuinEntry } from '@/db/types';
import { formatJa } from '@/lib/dates';
import { deleteImage, imageUri } from '@/lib/images';
import { colors, fonts, glow, radius } from '@/theme';

export default function GoshuinDetailScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [entry, setEntry] = useState<GoshuinEntry | null | undefined>(undefined);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    getEntry(db, id).then(setEntry);
  }, [db, id]);

  function confirmDelete() {
    Alert.alert('この御朱印を削除しますか？', '端末から写真も削除され、元に戻せません。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          const imageFile = await deleteGoshuin(db, id);
          if (imageFile) deleteImage(imageFile);
          router.back();
        },
      },
    ]);
  }

  if (entry === undefined) return null;
  if (entry === null) {
    return (
      <View style={styles.missing}>
        <Text style={styles.muted}>この御朱印は見つかりませんでした</Text>
      </View>
    );
  }

  const details: [string, string | null][] = [
    ['参拝日', formatJa(entry.visitedOn)],
    ['種類', GOSHUIN_KIND_LABEL[entry.kind]],
    ['初穂料', entry.fee !== null ? `${entry.fee.toLocaleString()}円` : null],
    ['天気', entry.weather],
    ['同行者', entry.companions],
    ['おみくじ', entry.omikuji],
  ];

  return (
    <ScrollView contentContainerStyle={styles.content} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && <Shimenawa width={width - 40} shide={6} style={styles.rope} />}
      <View style={styles.imageFrame}>
        <Image
          source={{ uri: imageUri(entry.imageFile) }}
          style={styles.image}
          resizeMode="contain"
          accessibilityLabel={`${entry.shrineName}の御朱印`}
        />
      </View>

      <View style={styles.titleRow}>
        <Torii size={40} style={styles.titleTorii} />
        <View style={styles.titleBlock}>
          {entry.shrineKana ? <Text style={styles.kana}>{entry.shrineKana}</Text> : null}
          <Text style={styles.name}>{entry.shrineName}</Text>
          {entry.prefecture ? <Text style={styles.muted}>{entry.prefecture}</Text> : null}
        </View>
      </View>

      <View style={styles.table}>
        {details
          .filter(([, value]) => value)
          .map(([label, value], i) => (
            <View key={label} style={[styles.row, i > 0 && styles.rowBorder]}>
              <Text style={styles.rowLabel}>{label}</Text>
              <Text style={styles.rowValue}>{value}</Text>
            </View>
          ))}
      </View>

      {entry.memo ? (
        <View style={styles.memo}>
          <Text style={styles.rowLabel}>メモ</Text>
          <Text style={styles.memoText}>{entry.memo}</Text>
        </View>
      ) : null}

      <Button label="この御朱印を削除" variant="secondary" onPress={confirmDelete} style={styles.delete} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 20 },
  imageFrame: {
    aspectRatio: 1 / 1.45,
    borderRadius: radius.lg,
    boxShadow: glow.soft,
    backgroundColor: colors.page,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '94%', height: '96%' },
  rope: { marginBottom: -14, zIndex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleTorii: { marginTop: 4 },
  titleBlock: { flex: 1, gap: 2 },
  kana: { fontFamily: fonts.regular, fontSize: 12, letterSpacing: 1, color: colors.muted },
  name: { fontFamily: fonts.display, fontSize: 26, color: colors.ink },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  table: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  row: { minHeight: 48, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  rowLabel: { width: 72, fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  rowValue: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  memo: { gap: 6 },
  memoText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 24, color: colors.ink },
  delete: { marginTop: 8 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
