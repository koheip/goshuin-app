import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Field, FieldLabel } from '@/components/ui';
import { getBook, listBookEntries, renameBook, reorderBook } from '@/db/repo';
import type { GoshuinEntry } from '@/db/types';
import { formatDot } from '@/lib/dates';
import { imageUri } from '@/lib/images';
import { colors, fonts, radius } from '@/theme';

export default function EditBookScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [name, setName] = useState<string | null>(null);
  const [entries, setEntries] = useState<GoshuinEntry[]>([]);
  const [moved, setMoved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const book = await getBook(db, id);
      if (!book) return;
      setEntries(await listBookEntries(db, id));
      setName(book.name);
    })();
  }, [db, id]);

  function move(index: number, delta: -1 | 1) {
    const to = index + delta;
    if (to < 0 || to >= entries.length) return;
    const next = [...entries];
    [next[index], next[to]] = [next[to], next[index]];
    setEntries(next);
    setMoved(true);
  }

  // 参拝日の古い順に戻す
  function sortByDate() {
    setEntries([...entries].sort((a, b) => a.visitedOn.localeCompare(b.visitedOn)));
    setMoved(true);
  }

  async function save() {
    if (!name?.trim()) return;
    setSaving(true);
    try {
      await renameBook(db, id, name);
      if (moved) await reorderBook(db, id, entries.map((e) => e.id));
      router.back();
    } catch (e) {
      setSaving(false);
      Alert.alert('保存できませんでした', String(e));
    }
  }

  if (name === null) return null;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="帳の名前" value={name} onChangeText={setName} maxLength={30} />

        <View style={styles.group}>
          <View style={styles.orderHead}>
            <FieldLabel>並び順</FieldLabel>
            {entries.length > 1 && (
              <Pressable accessibilityRole="button" hitSlop={8} onPress={sortByDate}>
                <Text style={styles.link}>参拝日の順に並べる</Text>
              </Pressable>
            )}
          </View>
          {entries.length === 0 ? (
            <Text style={styles.muted}>まだ御朱印はありません</Text>
          ) : (
            <View style={styles.list}>
              {entries.map((entry, i) => (
                <View key={entry.id} style={[styles.row, i > 0 && styles.rowBorder]}>
                  <Text style={styles.index}>{i + 1}</Text>
                  <Image source={{ uri: imageUri(entry.imageFile) }} style={styles.thumb} resizeMode="contain" />
                  <View style={styles.flex}>
                    <Text style={styles.name} numberOfLines={1}>
                      {entry.shrineName}
                    </Text>
                    <Text style={styles.muted}>{formatDot(entry.visitedOn)}</Text>
                  </View>
                  <MoveButton
                    icon="chevron-up"
                    label={`${i + 1}番目の${entry.shrineName}を前へ`}
                    disabled={i === 0}
                    onPress={() => move(i, -1)}
                  />
                  <MoveButton
                    icon="chevron-down"
                    label={`${i + 1}番目の${entry.shrineName}を後ろへ`}
                    disabled={i === entries.length - 1}
                    onPress={() => move(i, 1)}
                  />
                </View>
              ))}
            </View>
          )}
          <Text style={styles.note}>上から順に、見開きの左ページ・右ページへと綴じられます。</Text>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button label="保存する" onPress={save} loading={saving} disabled={!name.trim()} />
      </View>
    </KeyboardAvoidingView>
  );
}

function MoveButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: 'chevron-up' | 'chevron-down';
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
      hitSlop={4}
      style={({ pressed }) => [styles.move, pressed && { backgroundColor: colors.track }, disabled && { opacity: 0.3 }]}
    >
      <Ionicons name={icon} size={18} color={colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, gap: 20 },
  group: { gap: 10 },
  orderHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { fontFamily: fonts.regular, fontSize: 13, color: colors.accent },
  list: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  row: { minHeight: 72, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  index: { width: 22, fontFamily: fonts.bold, fontSize: 13, color: colors.muted, textAlign: 'center' },
  thumb: { width: 38, height: 55, borderRadius: 6, backgroundColor: colors.page },
  name: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  muted: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  move: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.muted },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.paper,
  },
});
