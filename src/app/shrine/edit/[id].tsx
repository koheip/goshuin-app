import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LocationButton } from '@/components/LocationButton';
import { Button, Chip, ChipGroup, Field, FieldLabel } from '@/components/ui';
import { deleteShrine, getShrine, setShrineLocation, updateShrine } from '@/db/repo';
import { PLACE_KIND_LABEL, type PlaceKind } from '@/db/types';
import { guessLineage, LINEAGES, type LineageSetting } from '@/lineage/catalog';
import { deleteImage } from '@/lib/images';
import type { Coords } from '@/lib/location';
import { colors, fonts } from '@/theme';

type Form = {
  name: string;
  kana: string;
  prefecture: string;
  kind: PlaceKind;
  lineage: LineageSetting;
  coords: Coords | null;
  coordsChanged: boolean;
  visitCount: number;
};

// 神社・お寺の名前などを直したり、まちがえて登録したものを削除したりする
export default function EditShrineScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [form, setForm] = useState<Form | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getShrine(db, id).then((shrine) =>
      setForm(
        shrine && {
          name: shrine.name,
          kana: shrine.kana ?? '',
          prefecture: shrine.prefecture ?? '',
          kind: shrine.kind,
          lineage: shrine.lineage as LineageSetting,
          coords:
            shrine.latitude !== null && shrine.longitude !== null
              ? { latitude: shrine.latitude, longitude: shrine.longitude }
              : null,
          coordsChanged: false,
          visitCount: shrine.visitCount,
        },
      ),
    );
  }, [db, id]);

  if (form === undefined) return null;
  if (form === null) {
    return (
      <View style={styles.missing}>
        <Text style={styles.muted}>この神社・お寺は見つかりませんでした</Text>
      </View>
    );
  }

  const current = form;
  const kindLabel = PLACE_KIND_LABEL[current.kind];
  const guessed = guessLineage(current.name, current.kind);

  function update(patch: Partial<Form>) {
    setForm({ ...current, ...patch });
  }

  async function save() {
    if (!current.name.trim()) return;
    setSaving(true);
    try {
      await updateShrine(db, id, current);
      if (current.coordsChanged && current.coords) await setShrineLocation(db, id, current.coords);
      router.back();
    } catch (e) {
      setSaving(false);
      Alert.alert('保存できませんでした', String(e));
    }
  }

  function confirmDelete() {
    Alert.alert(
      `この${kindLabel}を削除しますか？`,
      current.visitCount > 0
        ? `ここでの参拝の記録 ${current.visitCount}回分と、その御朱印・写真もすべて削除され、元に戻せません。`
        : '元に戻せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            const files = await deleteShrine(db, id);
            files.forEach(deleteImage);
            // この神社の参拝や御朱印の画面も開けなくなるので、タブまで戻る
            router.dismissAll();
          },
        },
      ],
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.group}>
          <FieldLabel>種類</FieldLabel>
          <ChipGroup>
            {(Object.keys(PLACE_KIND_LABEL) as PlaceKind[]).map((k) => (
              <Chip key={k} label={PLACE_KIND_LABEL[k]} selected={current.kind === k} onPress={() => update({ kind: k })} />
            ))}
          </ChipGroup>
        </View>
        <Field
          label="名前（必須）"
          value={current.name}
          onChangeText={(t) => update({ name: t })}
          placeholder={current.kind === 'temple' ? '例：〇〇寺' : '例：〇〇神社'}
        />
        <Field
          label="読み"
          value={current.kana}
          onChangeText={(t) => update({ kana: t })}
          placeholder={current.kind === 'temple' ? '例：まるまるでら' : '例：まるまるじんじゃ'}
        />
        {current.kind === 'shrine' && (
          <View style={styles.group}>
            <FieldLabel>系統</FieldLabel>
            <ChipGroup>
              <Chip
                label={guessed ? `自動（${guessed.name}）` : '自動'}
                selected={current.lineage === null}
                onPress={() => update({ lineage: null })}
              />
              {LINEAGES.map((lineage) => (
                <Chip
                  key={lineage.id}
                  label={lineage.name}
                  selected={current.lineage === lineage.id}
                  onPress={() => update({ lineage: lineage.id })}
                />
              ))}
              <Chip label="どれでもない" selected={current.lineage === 'none'} onPress={() => update({ lineage: 'none' })} />
            </ChipGroup>
            <Text style={styles.muted}>「自動」は名前から判断します。選んだ系統の解説が、この神社のページに表示されます。</Text>
          </View>
        )}
        <Field label="都道府県" value={current.prefecture} onChangeText={(t) => update({ prefecture: t })} placeholder="例：東京都" />
        <View style={styles.group}>
          <FieldLabel>{`この${kindLabel}の位置`}</FieldLabel>
          <LocationButton value={current.coords} onChange={(coords) => update({ coords, coordsChanged: true })} />
        </View>

        <Button label={`この${kindLabel}を削除`} variant="secondary" onPress={confirmDelete} style={styles.delete} />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button label="保存する" onPress={save} loading={saving} disabled={!current.name.trim()} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, paddingTop: 8, gap: 20 },
  group: { gap: 10 },
  delete: { marginTop: 12 },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.paper,
  },
});
