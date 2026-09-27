import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, ChipGroup, Field, FieldLabel } from '@/components/ui';
import { getVisit, updateVisit } from '@/db/repo';
import { WEATHER_OPTIONS } from '@/db/types';
import { formatJa, isValidIsoDate, today } from '@/lib/dates';
import { colors, fonts } from '@/theme';

type Form = {
  shrineName: string;
  visitedOn: string;
  weather: string | null;
  companions: string;
  omikuji: string;
  memo: string;
};

export default function EditVisitScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [form, setForm] = useState<Form | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getVisit(db, id).then((visit) =>
      setForm(
        visit && {
          shrineName: visit.shrineName,
          visitedOn: visit.visitedOn,
          weather: visit.weather,
          companions: visit.companions ?? '',
          omikuji: visit.omikuji ?? '',
          memo: visit.memo ?? '',
        },
      ),
    );
  }, [db, id]);

  if (form === undefined) return null;
  if (form === null) {
    return (
      <View style={styles.missing}>
        <Text style={styles.muted}>この参拝の記録は見つかりませんでした</Text>
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
      await updateVisit(db, id, {
        visitedOn: current.visitedOn,
        weather: current.weather,
        companions: current.companions.trim() || null,
        omikuji: current.omikuji.trim() || null,
        memo: current.memo.trim() || null,
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

        <Field
          label="参拝日（例：2025-04-12）"
          value={current.visitedOn}
          onChangeText={(t) => update({ visitedOn: t.trim() })}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          hint={dateValid ? formatJa(current.visitedOn) : '「年-月-日」の形で、今日までの日付を入力してください'}
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

        <Field label="同行者" value={current.companions} onChangeText={(t) => update({ companions: t })} placeholder="例：家族と" />
        <Field label="おみくじ" value={current.omikuji} onChangeText={(t) => update({ omikuji: t })} placeholder="例：吉" />
        <Field
          label="メモ"
          value={current.memo}
          onChangeText={(t) => update({ memo: t })}
          placeholder="その日の空気や感じたことを。"
          multiline
        />
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
