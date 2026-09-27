import Ionicons from '@expo/vector-icons/Ionicons';
import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, ChipGroup, Field, FieldLabel, Stepper } from '@/components/ui';
import { getAvatarPreferences, getCurrentBook, getJourneyStats, saveVisit } from '@/db/repo';
import { FEE_LABEL, GOSHUIN_KIND_LABEL, type GoshuinKind, WEATHER_OPTIONS } from '@/db/types';
import { formatJa, isValidIsoDate, shiftDays, today } from '@/lib/dates';
import { deleteImage, PermissionDeniedError, persistImage, pickGoshuinImage, type PickSource } from '@/lib/images';
import { useDraft } from '@/record/draft';
import { colors, fonts, glow, radius } from '@/theme';

const KINDS = Object.keys(GOSHUIN_KIND_LABEL) as GoshuinKind[];

export default function MemoScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { draft, update, updateGoshuin, reset } = useDraft();
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState<PickSource | null>(null);

  const dateValid = isValidIsoDate(draft.visitedOn) && draft.visitedOn <= today();
  const todayIso = today();
  const yesterdayIso = shiftDays(todayIso, -1);
  const feeLabel = FEE_LABEL[draft.shrine?.kind ?? 'shrine'];

  async function addGoshuin(source: PickSource) {
    setPicking(source);
    try {
      const tempUri = await pickGoshuinImage(source);
      if (tempUri) {
        update({ goshuin: [...draft.goshuin, { key: randomUUID(), tempUri, kind: 'regular', fee: '' }] });
      }
    } catch (e) {
      if (e instanceof PermissionDeniedError) {
        Alert.alert(e.message, '設定アプリから許可すると、撮影や写真の選択ができるようになります。', [
          { text: 'キャンセル', style: 'cancel' },
          { text: '設定を開く', onPress: () => Linking.openSettings() },
        ]);
      } else {
        Alert.alert('画像を読み込めませんでした', String(e));
      }
    } finally {
      setPicking(null);
    }
  }

  async function addPhoto(source: PickSource) {
    setPicking(source);
    try {
      const tempUri = await pickGoshuinImage(source);
      if (tempUri) update({ photos: [...draft.photos, { key: randomUUID(), tempUri }] });
    } catch (e) {
      if (e instanceof PermissionDeniedError) {
        Alert.alert(e.message, '設定アプリから許可すると、撮影や写真の選択ができるようになります。', [
          { text: 'キャンセル', style: 'cancel' },
          { text: '設定を開く', onPress: () => Linking.openSettings() },
        ]);
      } else {
        Alert.alert('画像を読み込めませんでした', String(e));
      }
    } finally {
      setPicking(null);
    }
  }

  async function save() {
    if (!draft.shrine || !dateValid) return;
    setSaving(true);
    const savedFiles: string[] = [];
    try {
      const before = await getJourneyStats(db);
      const goshuin = draft.goshuin.map((g) => {
        const imageFile = persistImage(g.tempUri);
        savedFiles.push(imageFile);
        return { imageFile, kind: g.kind, fee: g.fee ? Number(g.fee) : null };
      });
      const photos = draft.photos.map((photo) => {
        const imageFile = persistImage(photo.tempUri);
        savedFiles.push(imageFile);
        return { imageFile };
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
        photos,
      });
      const [after, preferences] = await Promise.all([getJourneyStats(db), getAvatarPreferences(db)]);
      const unlockedAt = [2, 5, 10].find((threshold) => before.visitCount < threshold && after.visitCount >= threshold);
      const shrineName = draft.shrine.name;
      reset();
      router.replace({
        pathname: '/record/success',
        params: {
          book: book.id,
          shrine: shrineName,
          guide: preferences.blessing,
          visits: String(after.visitCount),
          firstVisit: String(after.shrineCount > before.shrineCount),
          unlockedAt: unlockedAt ? String(unlockedAt) : '',
        },
      });
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
        <Stepper current={2} />
        <View style={styles.summary}>
          <Text style={styles.shrineName}>{draft.shrine?.name}</Text>
          <Text style={styles.summaryMeta}>{draft.goshuin.length > 0 ? `御朱印 ${draft.goshuin.length}枚` : '日々の参拝'}</Text>
        </View>

        <View style={styles.photoSection}>
          <View style={styles.goshuinTitleRow}>
            <Ionicons name="images-outline" size={20} color={colors.violet} />
            <Text style={styles.goshuinTitle}>参拝の写真</Text>
            <View style={styles.optionalBadge}><Text style={styles.optionalText}>任意</Text></View>
          </View>
          <Text style={styles.goshuinHelp}>鳥居や境内など、その日の思い出を残せます。</Text>
          {draft.photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
              {draft.photos.map((photo, i) => (
                <View key={photo.key} style={styles.photoItem}>
                  <Image source={{ uri: photo.tempUri }} style={styles.visitPhoto} accessibilityLabel={`参拝の写真 ${i + 1}`} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`参拝の写真 ${i + 1} を取り消す`}
                    onPress={() => update({ photos: draft.photos.filter((item) => item.key !== photo.key) })}
                    hitSlop={8}
                    style={styles.photoRemove}
                  >
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
          <View style={styles.pickRow}>
            <Button label="撮影して追加" variant="secondary" loading={picking === 'camera'} disabled={picking !== null} onPress={() => addPhoto('camera')} icon={<Ionicons name="camera-outline" size={19} color={colors.ink} />} style={styles.flex} />
            <Button label="写真から追加" variant="secondary" loading={picking === 'library'} disabled={picking !== null} onPress={() => addPhoto('library')} icon={<Ionicons name="images-outline" size={19} color={colors.ink} />} style={styles.flex} />
          </View>
        </View>

        <View style={styles.goshuinSection}>
          <View style={styles.goshuinHeading}>
            <View style={styles.goshuinTitleRow}>
              <Ionicons name="book-outline" size={20} color={colors.accent} />
              <Text style={styles.goshuinTitle}>御朱印</Text>
              <View style={styles.optionalBadge}>
                <Text style={styles.optionalText}>任意</Text>
              </View>
            </View>
            <Text style={styles.goshuinHelp}>授かったときだけ、写真をこの参拝記録に添えられます。</Text>
          </View>

          {draft.goshuin.map((g, i) => (
            <View key={g.key} style={styles.goshuinCard}>
              <Image source={{ uri: g.tempUri }} style={styles.thumb} accessibilityLabel={`御朱印 ${i + 1} の写真`} />
              <View style={styles.cardBody}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle}>御朱印 {i + 1}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`御朱印 ${i + 1} を取り消す`}
                    hitSlop={10}
                    onPress={() => update({ goshuin: draft.goshuin.filter((item) => item.key !== g.key) })}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.muted} />
                  </Pressable>
                </View>
                <ChipGroup>
                  {KINDS.map((kind) => (
                    <Chip
                      key={kind}
                      label={GOSHUIN_KIND_LABEL[kind]}
                      selected={g.kind === kind}
                      onPress={() => updateGoshuin(g.key, { kind })}
                    />
                  ))}
                </ChipGroup>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>{feeLabel}</Text>
                  <TextInput
                    value={g.fee}
                    onChangeText={(value) => updateGoshuin(g.key, { fee: value.replace(/[^0-9]/g, '') })}
                    keyboardType="number-pad"
                    placeholder="500"
                    placeholderTextColor={colors.placeholder}
                    accessibilityLabel={`御朱印 ${i + 1} の${feeLabel}（円）`}
                    style={styles.feeInput}
                  />
                  <Text style={styles.feeLabel}>円</Text>
                </View>
              </View>
            </View>
          ))}

          <View style={styles.pickRow}>
            <Button
              label="撮影して追加"
              variant="secondary"
              loading={picking === 'camera'}
              disabled={picking !== null}
              onPress={() => addGoshuin('camera')}
              icon={<Ionicons name="camera-outline" size={19} color={colors.ink} />}
              style={styles.flex}
            />
            <Button
              label="写真から追加"
              variant="secondary"
              loading={picking === 'library'}
              disabled={picking !== null}
              onPress={() => addGoshuin('library')}
              icon={<Ionicons name="images-outline" size={19} color={colors.ink} />}
              style={styles.flex}
            />
          </View>
          <Text style={styles.imageNote}>御朱印がなくても、このまま参拝を記録できます。</Text>
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
        <Button label="参拝を記録する" onPress={save} loading={saving} disabled={!dateValid} />
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
  goshuinSection: {
    gap: 12,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  photoSection: {
    gap: 10,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  photoStrip: { gap: 10, paddingVertical: 2, paddingRight: 4 },
  photoItem: { position: 'relative' },
  visitPhoto: { width: 112, height: 88, borderRadius: 13, backgroundColor: colors.page },
  photoRemove: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(33, 29, 58, .72)',
  },
  goshuinHeading: { gap: 5 },
  goshuinTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  goshuinTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  optionalBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: colors.accentTint },
  optionalText: { fontFamily: fonts.bold, fontSize: 10, color: colors.accent },
  goshuinHelp: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.muted },
  goshuinCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    boxShadow: glow.soft,
  },
  thumb: { width: 76, height: 104, borderRadius: 10, backgroundColor: colors.page },
  cardBody: { flex: 1, gap: 9 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  feeRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  feeLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft },
  feeInput: {
    width: 82,
    height: 38,
    paddingHorizontal: 9,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.ink,
    textAlign: 'right',
  },
  pickRow: { flexDirection: 'row', gap: 8 },
  imageNote: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 17, color: colors.muted },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.paper,
  },
});
