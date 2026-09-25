import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, ChipGroup, Field, FieldLabel, Stepper } from '@/components/ui';
import { getCurrentBook, saveVisit } from '@/db/repo';
import { WEATHER_OPTIONS } from '@/db/types';
import { formatJa, isValidIsoDate, shiftDays, today } from '@/lib/dates';
import { deleteImage, persistImage } from '@/lib/images';
import { useDraft } from '@/record/draft';
import { colors, fonts } from '@/theme';

export default function MemoScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { draft, update, reset } = useDraft();
  const [saving, setSaving] = useState(false);

  const dateValid = isValidIsoDate(draft.visitedOn) && draft.visitedOn <= today();
  const todayIso = today();
  const yesterdayIso = shiftDays(todayIso, -1);

  async function save() {
    if (!draft.shrine || draft.goshuin.length === 0 || !dateValid) return;
    setSaving(true);
    const savedFiles: string[] = [];
    try {
      const goshuin = draft.goshuin.map((g) => {
        const imageFile = persistImage(g.tempUri);
        savedFiles.push(imageFile);
        return { imageFile, kind: g.kind, fee: g.fee ? Number(g.fee) : null };
      });
      const book = await getCurrentBook(db);
      await saveVisit(db, book.id, {
        shrineId: draft.shrine.id,
        visitedOn: draft.visitedOn,
        weather: draft.weather,
        companions: draft.companions.trim() || null,
        omikuji: draft.omikuji.trim() || null,
        memo: draft.memo.trim() || null,
        goshuin,
      });
      reset();
      // 別の帳を見ていたときも、今記録した帳を開く
      router.dismissTo({ pathname: '/book', params: { book: book.id } });
    } catch (e) {
      // DBに書けなかったときは、先にコピーした画像を残さない
      savedFiles.forEach(deleteImage);
      setSaving(false);
      Alert.alert('保存できませんでした', String(e));
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Stepper current={3} />
        <View style={styles.summary}>
          <Text style={styles.shrineName}>{draft.shrine?.name}</Text>
          <Text style={styles.summaryMeta}>御朱印 {draft.goshuin.length}枚</Text>
        </View>

        <View style={styles.group}>
          <FieldLabel>参拝日</FieldLabel>
          <ChipGroup>
            <Chip label="今日" selected={draft.visitedOn === todayIso} onPress={() => update({ visitedOn: todayIso })} />
            <Chip
              label="昨日"
              selected={draft.visitedOn === yesterdayIso}
              onPress={() => update({ visitedOn: yesterdayIso })}
            />
          </ChipGroup>
          <Field
            label="日付を入力（例：2025-04-12）"
            value={draft.visitedOn}
            onChangeText={(t) => update({ visitedOn: t.trim() })}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            hint={
              dateValid
                ? formatJa(draft.visitedOn)
                : '「年-月-日」の形で、今日までの日付を入力してください'
            }
          />
        </View>

        <View style={styles.group}>
          <FieldLabel>天気</FieldLabel>
          <ChipGroup>
            {WEATHER_OPTIONS.map((w) => (
              <Chip
                key={w}
                label={w}
                selected={draft.weather === w}
                onPress={() => update({ weather: draft.weather === w ? null : w })}
              />
            ))}
          </ChipGroup>
        </View>

        <Field
          label="同行者"
          value={draft.companions}
          onChangeText={(t) => update({ companions: t })}
          placeholder="例：家族と"
        />
        <Field
          label="おみくじ"
          value={draft.omikuji}
          onChangeText={(t) => update({ omikuji: t })}
          placeholder="例：吉"
        />
        <Field
          label="メモ"
          value={draft.memo}
          onChangeText={(t) => update({ memo: t })}
          placeholder="その日の空気や感じたことを。"
          multiline
        />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button label="御朱印帳に綴じる" onPress={save} loading={saving} disabled={!dateValid} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, paddingTop: 8, gap: 20 },
  summary: { gap: 2 },
  shrineName: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  summaryMeta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  group: { gap: 10 },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.paper,
  },
});
