import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, ChipGroup, Field, FieldLabel } from '@/components/ui';
import { getEntry, updateEntry } from '@/db/repo';
import { FEE_LABEL, GOSHUIN_KIND_LABEL, WEATHER_OPTIONS, type GoshuinKind, type PlaceKind } from '@/db/types';
import { formatJa, isValidIsoDate, today } from '@/lib/dates';
import { colors, fonts } from '@/theme';

const KINDS = Object.keys(GOSHUIN_KIND_LABEL) as GoshuinKind[];

type Form = {
  shrineName: string;
  shrineKind: PlaceKind;
  visitedOn: string;
  weather: string | null;
  companions: string;
  omikuji: string;
  memo: string;
  kind: GoshuinKind;
  fee: string;
};

export default function EditGoshuinScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [form, setForm] = useState<Form | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getEntry(db, id).then((entry) =>
      setForm(
        entry && {
          shrineName: entry.shrineName,
          shrineKind: entry.shrineKind,
          visitedOn: entry.visitedOn,
          weather: entry.weather,
          companions: entry.companions ?? '',
          omikuji: entry.omikuji ?? '',
          memo: entry.memo ?? '',
          kind: entry.kind,
          fee: entry.fee !== null ? String(entry.fee) : '',
        },
      ),
    );
  }, [db, id]);

  if (form === undefined) return null;
  if (form === null) {
    return (
      <View style={styles.missing}>
        <Text style={styles.muted}>この御朱印は見つかりませんでした</Text>
      </View>
    );
  }

  const current = form;
  const dateValid = isValidIsoDate(current.visitedOn) && current.visitedOn <= today();

  function update(patch: Partial<Form>) {
    setForm({ ...current, ...patch });
  }

  async function save() {
    if (!dateValid) return;
    setSaving(true);
    try {
      await updateEntry(db, id, {
        visitedOn: current.visitedOn,
        weather: current.weather,
        companions: current.companions.trim() || null,
        omikuji: current.omikuji.trim() || null,
        memo: current.memo.trim() || null,
        kind: current.kind,
        fee: current.fee ? Number(current.fee) : null,
      });
      router.back();
    } catch (e) {
      setSaving(false);
      Alert.alert('保存できませんでした', String(e));
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.shrineName}>{current.shrineName}</Text>

        <View style={styles.group}>
          <FieldLabel>種類</FieldLabel>
          <ChipGroup>
            {KINDS.map((k) => (
              <Chip key={k} label={GOSHUIN_KIND_LABEL[k]} selected={current.kind === k} onPress={() => update({ kind: k })} />
            ))}
          </ChipGroup>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>{FEE_LABEL[current.shrineKind]}</Text>
            <TextInput
              value={current.fee}
              onChangeText={(t) => update({ fee: t.replace(/[^0-9]/g, '') })}
              keyboardType="number-pad"
              placeholder="500"
              placeholderTextColor={colors.placeholder}
              accessibilityLabel={`${FEE_LABEL[current.shrineKind]}（円）`}
              style={styles.feeInput}
            />
            <Text style={styles.feeLabel}>円</Text>
          </View>
        </View>

        <Field
          label="参拝日（例：2025-04-12）"
          value={current.visitedOn}
          onChangeText={(t) => update({ visitedOn: t.trim() })}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          hint={
            dateValid ? formatJa(current.visitedOn) : '「年-月-日」の形で、今日までの日付を入力してください'
          }
        />

        <View style={styles.group}>
          <FieldLabel>天気</FieldLabel>
          <ChipGroup>
            {WEATHER_OPTIONS.map((w) => (
              <Chip
                key={w}
                label={w}
                selected={current.weather === w}
                onPress={() => update({ weather: current.weather === w ? null : w })}
              />
            ))}
          </ChipGroup>
        </View>

        <Field
          label="同行者"
          value={current.companions}
          onChangeText={(t) => update({ companions: t })}
          placeholder="例：家族と"
        />
        <Field
          label="おみくじ"
          value={current.omikuji}
          onChangeText={(t) => update({ omikuji: t })}
          placeholder="例：吉"
        />
        <Field
          label="メモ"
          value={current.memo}
          onChangeText={(t) => update({ memo: t })}
          placeholder="その日の空気や感じたことを。"
          multiline
        />
        <Text style={styles.note}>参拝日・天気・同行者・おみくじ・メモは、同じ参拝で授かった御朱印すべてに反映されます。</Text>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button label="保存する" onPress={save} loading={saving} disabled={!dateValid} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, paddingTop: 8, gap: 20 },
  shrineName: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  group: { gap: 10 },
  feeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  feeLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.inkSoft },
  feeInput: {
    width: 90,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    backgroundColor: colors.paper,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
    textAlign: 'right',
  },
  note: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.muted },
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
