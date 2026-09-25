import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Field } from '@/components/ui';
import { KamiLoadingScreen } from '@/components/KamiLoadingScreen';
import { listBooks, startNewBook } from '@/db/repo';
import type { BookWithStats } from '@/db/types';
import { formatDot, today } from '@/lib/dates';
import { colors, fonts, glow, gradients, radius } from '@/theme';

const NUMERALS = ['壱', '弐', '参', '肆', '伍', '陸', '漆', '捌', '玖', '拾'];

// 次の帳の名前の候補（壱の帳・弐の帳…）
function suggestName(count: number): string {
  return count < NUMERALS.length ? `${NUMERALS[count]}の帳` : `${count + 1}冊目の帳`;
}

export default function BooksScreen() {
  const db = useSQLiteContext();
  const [books, setBooks] = useState<BookWithStats[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const rows = await listBooks(db);
    setBooks(rows);
    return rows;
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function openAdd() {
    setNewName(suggestName(books?.length ?? 0));
    setAdding(true);
  }

  function confirmStart() {
    Alert.alert(
      `「${newName.trim()}」を始めますか？`,
      '今の帳は閉じられ、これからの記録は新しい帳に綴じられます。閉じた帳もいつでも見返せます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '始める', onPress: start },
      ],
    );
  }

  async function start() {
    setSaving(true);
    try {
      const book = await startNewBook(db, newName, today());
      router.navigate({ pathname: '/book', params: { book: book.id } });
    } catch (e) {
      Alert.alert('新しい帳を始められませんでした', String(e));
      setSaving(false);
    }
  }

  if (books === null) return <View style={styles.flex}><KamiLoadingScreen variant="loading" message="御朱印帳をそろえています…" /></View>;
  const currentId = books.find((b) => b.endedOn === null)?.id ?? books[0]?.id;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {books.map((book) => {
          const current = book.id === currentId;
          const period =
            book.firstVisitedOn && book.lastVisitedOn
              ? `${formatDot(book.firstVisitedOn)} 〜 ${formatDot(book.lastVisitedOn)}`
              : 'まだ御朱印はありません';
          return (
            <View key={book.id} style={styles.card}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${book.name}を開く`}
                onPress={() => router.navigate({ pathname: '/book', params: { book: book.id } })}
                style={styles.cardMain}
              >
                <LinearGradient
                  colors={current ? gradients.primary : gradients.cover}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.spine}
                />
                <View style={styles.flex}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{book.name}</Text>
                    {current && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeLabel}>記録中</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.meta}>
                    {book.goshuinCount}枚 · {period}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${book.name}の名前や並び順を変える`}
                hitSlop={8}
                onPress={() => router.push({ pathname: '/books/[id]', params: { id: book.id } })}
                style={styles.settings}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color={colors.inkSoft} />
              </Pressable>
            </View>
          );
        })}

        {adding ? (
          <View style={styles.addForm}>
            <Text style={styles.addTitle}>次の御朱印帳を始める</Text>
            <Field label="帳の名前" value={newName} onChangeText={setNewName} maxLength={30} />
            <View style={styles.addActions}>
              <Button label="やめる" variant="secondary" onPress={() => setAdding(false)} style={styles.flex} />
              <Button
                label="始める"
                onPress={confirmStart}
                disabled={!newName.trim()}
                loading={saving}
                style={styles.flex}
              />
            </View>
          </View>
        ) : (
          <Button
            label="次の御朱印帳を始める"
            variant="secondary"
            onPress={openAdd}
            icon={<Ionicons name="add" size={20} color={colors.ink} />}
          />
        )}
        <Text style={styles.note}>帳面がいっぱいになったら、次の帳を始めましょう。新しい記録は「記録中」の帳に綴じられます。</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, gap: 14 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    boxShadow: glow.soft,
  },
  cardMain: { flex: 1, minHeight: 76, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  spine: { width: 14, alignSelf: 'stretch', borderRadius: 7 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: colors.accentTint },
  badgeLabel: { fontFamily: fonts.bold, fontSize: 11, color: colors.accentOnTint },
  meta: { marginTop: 4, fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  settings: { width: 48, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  addForm: {
    gap: 14,
    padding: 16,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  addTitle: { fontSize: 15, fontFamily: fonts.bold, color: colors.ink },
  addActions: { flexDirection: 'row', gap: 10 },
  note: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.muted },
});
