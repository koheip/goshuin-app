import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PlaceMark } from '@/components/shrine';
import { Button } from '@/components/ui';
import { deleteVisit, getVisit } from '@/db/repo';
import { GOSHUIN_KIND_LABEL, type VisitDetail } from '@/db/types';
import { formatJa } from '@/lib/dates';
import { deleteImage, imageUri } from '@/lib/images';
import { openInGoogleMaps } from '@/lib/maps';
import { colors, fonts, radius } from '@/theme';

// 1回の参拝の詳細。御朱印がない日の参拝もここで見て、編集・削除する
export default function VisitDetailScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [visit, setVisit] = useState<VisitDetail | null | undefined>(undefined);

  // 編集画面から戻ったときにも最新の内容を読み直す
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getVisit(db, id).then((row) => {
        if (active) setVisit(row);
      });
      return () => {
        active = false;
      };
    }, [db, id]),
  );

  if (visit === undefined) return null;
  if (visit === null) {
    return (
      <View style={styles.missing}>
        <Text style={styles.muted}>この参拝の記録は見つかりませんでした</Text>
      </View>
    );
  }

  const current = visit;

  function confirmDelete() {
    const extras = [
      current.goshuin.length > 0 ? `御朱印 ${current.goshuin.length}枚` : null,
      current.photos.length > 0 ? `写真 ${current.photos.length}枚` : null,
    ].filter(Boolean);
    Alert.alert(
      'この参拝の記録を削除しますか？',
      `${extras.length > 0 ? `${extras.join('と')}も端末から削除され、` : ''}元に戻せません。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            const files = await deleteVisit(db, id);
            files.forEach(deleteImage);
            router.back();
          },
        },
      ],
    );
  }

  async function openMap() {
    try {
      await openInGoogleMaps({
        name: current.shrineName,
        prefecture: current.prefecture,
        address: current.address,
        latitude: current.latitude,
        longitude: current.longitude,
        placeId: current.placeId,
      });
    } catch {
      Alert.alert('地図を開けませんでした', 'Google マップまたはブラウザを確認してください。');
    }
  }

  const details: [string, string | null][] = [
    ['参拝日', formatJa(current.visitedOn)],
    ['天気', current.weather],
    ['同行者', current.companions],
    ['おみくじ', current.omikuji],
  ];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        <PlaceMark kind={current.shrineKind} size={40} />
        <View style={styles.titleBlock}>
          {current.shrineKana ? <Text style={styles.kana}>{current.shrineKana}</Text> : null}
          <Text style={styles.name}>{current.shrineName}</Text>
          {current.prefecture ? <Text style={styles.muted}>{current.prefecture}</Text> : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${current.shrineName}の情報を編集`}
          hitSlop={8}
          onPress={() => router.push({ pathname: '/shrine/edit/[id]', params: { id: current.shrineId } })}
          style={({ pressed }) => [styles.shrineEdit, pressed && styles.pressed]}
        >
          <Ionicons name="create-outline" size={16} color={colors.accent} />
          <Text style={styles.shrineEditText}>編集</Text>
        </Pressable>
      </View>

      <Button
        label="Google マップで開く"
        variant="secondary"
        onPress={openMap}
        icon={<Ionicons name="navigate-outline" size={18} color={colors.ink} />}
      />

      {current.goshuin.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>御朱印</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
            {current.goshuin.map((g) => (
              <Pressable
                key={g.id}
                accessibilityRole="button"
                accessibilityLabel={`${GOSHUIN_KIND_LABEL[g.kind]}の御朱印を開く`}
                onPress={() => router.push({ pathname: '/goshuin/[id]', params: { id: g.id } })}
                style={({ pressed }) => [styles.goshuinThumb, pressed && styles.pressed]}
              >
                <Image source={{ uri: imageUri(g.imageFile) }} style={styles.thumbImage} resizeMode="cover" />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {current.photos.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>写真</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
            {current.photos.map((photo) => (
              <Image key={photo.id} source={{ uri: imageUri(photo.imageFile) }} style={styles.photo} resizeMode="cover" />
            ))}
          </ScrollView>
        </View>
      )}

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

      {current.memo ? (
        <View style={styles.memo}>
          <Text style={styles.rowLabel}>メモ</Text>
          <Text style={styles.memoText}>{current.memo}</Text>
        </View>
      ) : null}

      <Button
        label="記録を編集"
        variant="secondary"
        onPress={() => router.push({ pathname: '/visit/edit/[id]', params: { id } })}
        icon={<Ionicons name="create-outline" size={18} color={colors.ink} />}
        style={styles.actions}
      />
      <Button label="この参拝の記録を削除" variant="secondary" onPress={confirmDelete} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleBlock: { flex: 1, gap: 2 },
  kana: { fontFamily: fonts.regular, fontSize: 12, letterSpacing: 1, color: colors.muted },
  name: { fontFamily: fonts.display, fontSize: 26, color: colors.ink },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  shrineEdit: {
    minHeight: 36,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 18,
    backgroundColor: colors.accentTint,
  },
  shrineEditText: { fontFamily: fonts.bold, fontSize: 12, color: colors.accent },
  section: { gap: 8 },
  sectionLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  strip: { gap: 10 },
  goshuinThumb: {
    width: 96,
    aspectRatio: 1 / 1.45,
    overflow: 'hidden',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.page,
  },
  thumbImage: { width: '100%', height: '100%' },
  photo: { width: 140, height: 140, borderRadius: radius.sm, backgroundColor: colors.track },
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
  actions: { marginTop: 8 },
  pressed: { opacity: 0.7 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
