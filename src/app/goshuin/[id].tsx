import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PlaceMark, Shimenawa } from '@/components/shrine';
import { Button } from '@/components/ui';
import { deleteGoshuin, getEntry } from '@/db/repo';
import { FEE_LABEL, GOSHUIN_KIND_LABEL, type GoshuinEntry } from '@/db/types';
import { formatJa } from '@/lib/dates';
import { deleteImage, imageUri } from '@/lib/images';
import { openInGoogleMaps } from '@/lib/maps';
import { colors, fonts, glow, radius } from '@/theme';

export default function GoshuinDetailScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [entry, setEntry] = useState<GoshuinEntry | null | undefined>(undefined);
  const [width, setWidth] = useState(0);

  // 編集画面から戻ったときにも最新の内容を読み直す
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getEntry(db, id).then((row) => {
        if (active) setEntry(row);
      });
      return () => {
        active = false;
      };
    }, [db, id]),
  );

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

  async function openMap() {
    if (!entry) return;
    try {
      await openInGoogleMaps({
        name: entry.shrineName,
        prefecture: entry.prefecture,
        address: entry.address,
        latitude: entry.latitude,
        longitude: entry.longitude,
        placeId: entry.placeId,
      });
    } catch {
      Alert.alert('地図を開けませんでした', 'Google マップまたはブラウザを確認してください。');
    }
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
    [FEE_LABEL[entry.shrineKind], entry.fee !== null ? `${entry.fee.toLocaleString()}円` : null],
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
        <PlaceMark kind={entry.shrineKind} size={40} style={styles.titleTorii} />
        <View style={styles.titleBlock}>
          {entry.shrineKana ? <Text style={styles.kana}>{entry.shrineKana}</Text> : null}
          <Text style={styles.name}>{entry.shrineName}</Text>
          {entry.prefecture ? <Text style={styles.muted}>{entry.prefecture}</Text> : null}
        </View>
      </View>

      <Button
        label="地図で見る"
        variant="secondary"
        onPress={openMap}
        icon={<Ionicons name="map-outline" size={18} color={colors.ink} />}
      />

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

      <Button
        label="記録を編集"
        variant="secondary"
        onPress={() => router.push({ pathname: '/goshuin/edit/[id]', params: { id } })}
        icon={<Ionicons name="create-outline" size={18} color={colors.ink} />}
        style={styles.delete}
      />
      <Button label="この御朱印を削除" variant="secondary" onPress={confirmDelete} />
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
