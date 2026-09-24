import Ionicons from '@expo/vector-icons/Ionicons';
import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
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

import { Button, Chip, ChipGroup, Stepper } from '@/components/ui';
import { GOSHUIN_KIND_LABEL, type GoshuinKind } from '@/db/types';
import { PermissionDeniedError, pickGoshuinImage, type PickSource } from '@/lib/images';
import { useDraft } from '@/record/draft';
import { colors, fonts, glow, radius } from '@/theme';

const KINDS = Object.keys(GOSHUIN_KIND_LABEL) as GoshuinKind[];

export default function PhotoScreen() {
  const insets = useSafeAreaInsets();
  const { draft, update, updateGoshuin } = useDraft();
  const [busy, setBusy] = useState<PickSource | null>(null);

  async function add(source: PickSource) {
    setBusy(source);
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
      setBusy(null);
    }
  }

  function remove(key: string) {
    update({ goshuin: draft.goshuin.filter((g) => g.key !== key) });
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Stepper current={2} />
        <Text style={styles.shrineName}>{draft.shrine?.name}</Text>

        {draft.goshuin.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="camera-outline" size={36} color={colors.muted} />
            <Text style={styles.emptyTitle}>授かった御朱印を撮影しましょう</Text>
            <Text style={styles.emptyBody}>
              帳面を平らに開き、明るい場所で真上から撮るときれいに残せます。1回の参拝で複数の御朱印を記録できます。
            </Text>
          </View>
        ) : (
          draft.goshuin.map((g, i) => (
            <View key={g.key} style={styles.card}>
              <Image source={{ uri: g.tempUri }} style={styles.thumb} accessibilityLabel={`御朱印 ${i + 1} の写真`} />
              <View style={styles.cardBody}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle}>御朱印 {i + 1}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`御朱印 ${i + 1} を取り消す`}
                    hitSlop={10}
                    onPress={() => remove(g.key)}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.muted} />
                  </Pressable>
                </View>
                <ChipGroup>
                  {KINDS.map((k) => (
                    <Chip
                      key={k}
                      label={GOSHUIN_KIND_LABEL[k]}
                      selected={g.kind === k}
                      onPress={() => updateGoshuin(g.key, { kind: k })}
                    />
                  ))}
                </ChipGroup>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>初穂料</Text>
                  <TextInput
                    value={g.fee}
                    onChangeText={(t) => updateGoshuin(g.key, { fee: t.replace(/[^0-9]/g, '') })}
                    keyboardType="number-pad"
                    placeholder="500"
                    placeholderTextColor={colors.placeholder}
                    accessibilityLabel={`御朱印 ${i + 1} の初穂料（円）`}
                    style={styles.feeInput}
                  />
                  <Text style={styles.feeLabel}>円</Text>
                </View>
              </View>
            </View>
          ))
        )}

        <View style={styles.pickRow}>
          <Button
            label="撮影する"
            variant="secondary"
            loading={busy === 'camera'}
            disabled={busy !== null}
            onPress={() => add('camera')}
            icon={<Ionicons name="camera-outline" size={20} color={colors.ink} />}
            style={styles.flex}
          />
          <Button
            label="写真から選ぶ"
            variant="secondary"
            loading={busy === 'library'}
            disabled={busy !== null}
            onPress={() => add('library')}
            icon={<Ionicons name="images-outline" size={20} color={colors.ink} />}
            style={styles.flex}
          />
        </View>
        <Text style={styles.note}>画像は端末内にだけ保存され、撮影場所の位置情報は取り除かれます。</Text>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button
          label="次へ：メモを入力"
          disabled={draft.goshuin.length === 0}
          onPress={() => router.push('/record/memo')}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, paddingTop: 8, gap: 16 },
  shrineName: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  emptyCard: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
  },
  emptyTitle: { fontSize: 15, fontFamily: fonts.bold, color: colors.ink },
  emptyBody: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.muted, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    gap: 14,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    boxShadow: glow.soft,
  },
  thumb: { width: 84, height: 116, borderRadius: 12, backgroundColor: colors.page },
  cardBody: { flex: 1, gap: 10 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.ink },
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
  pickRow: { flexDirection: 'row', gap: 10 },
  note: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.muted },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.paper,
  },
});
