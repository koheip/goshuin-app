import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LocationButton } from '@/components/LocationButton';
import { PlaceSearch } from '@/components/PlaceSearch';
import { PlaceMark } from '@/components/shrine';
import { Button, Chip, ChipGroup, Field, FieldLabel, Stepper } from '@/components/ui';
import { createShrine, searchShrines, type ShrineWithStats } from '@/db/repo';
import { PLACE_KIND_LABEL, type PlaceKind } from '@/db/types';
import { formatDot } from '@/lib/dates';
import type { Coords } from '@/lib/location';
import { placesSearchEnabled, type PlaceCandidate } from '@/lib/places';
import { useDraft } from '@/record/draft';
import { colors, radius, fonts } from '@/theme';

export default function SelectShrineScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { draft, update } = useDraft();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ShrineWithStats[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKana, setNewKana] = useState('');
  const [newPrefecture, setNewPrefecture] = useState('');
  const [newKind, setNewKind] = useState<PlaceKind>('shrine');
  const [newCoords, setNewCoords] = useState<Coords | null>(null);
  const [newPlaceId, setNewPlaceId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    searchShrines(db, query).then((rows) => {
      if (active) setResults(rows);
    });
    return () => {
      active = false;
    };
  }, [db, query]);

  const noShrinesYet = results !== null && results.length === 0 && query.trim() === '';
  const showAddForm = adding || noShrinesYet;

  async function addShrine() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const shrine = await createShrine(db, { name: newName, kana: newKana, prefecture: newPrefecture, kind: newKind, placeId: newPlaceId, ...newCoords });
      update({ shrine: { id: shrine.id, name: shrine.name, kind: shrine.kind } });
      setAdding(false);
      setNewName('');
      setNewKana('');
      setNewPrefecture('');
      setNewKind('shrine');
      setNewCoords(null);
      setNewPlaceId(null);
      setQuery('');
      setResults(await searchShrines(db, ''));
    } catch (e) {
      Alert.alert('追加できませんでした', String(e));
    } finally {
      setSaving(false);
    }
  }

  function pickPlace(place: PlaceCandidate) {
    setNewName(place.name);
    setNewKind(place.kind);
    setNewPlaceId(place.placeId);
  }

  const header = (
    <View style={styles.headerBlock}>
      <Stepper current={1} />
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="登録済みの神社・お寺を検索"
          placeholderTextColor={colors.placeholder}
          accessibilityLabel="登録済みの神社・お寺を検索"
          style={styles.searchInput}
          returnKeyType="search"
        />
      </View>
      {!noShrinesYet && <Text style={styles.sectionLabel}>これまでに記録した神社・お寺</Text>}
    </View>
  );

  const footer = (
    <View style={styles.addBlock}>
      {showAddForm ? (
        <View style={styles.addForm}>
          <Text style={styles.addTitle}>
            {noShrinesYet ? '最初の神社・お寺を追加しましょう' : '神社・お寺を追加'}
          </Text>
          {placesSearchEnabled && <PlaceSearch onPick={pickPlace} />}
          {newPlaceId && (
            <View style={styles.linked}>
              <Ionicons name="link" size={16} color={colors.accent} />
              <Text style={styles.linkedText}>Google マップの場所とつなげました</Text>
              <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setNewPlaceId(null)}>
                <Text style={styles.linkedClear}>外す</Text>
              </Pressable>
            </View>
          )}
          <View style={styles.kindGroup}>
            <FieldLabel>種類</FieldLabel>
            <ChipGroup>
              {(Object.keys(PLACE_KIND_LABEL) as PlaceKind[]).map((k) => (
                <Chip key={k} label={PLACE_KIND_LABEL[k]} selected={newKind === k} onPress={() => setNewKind(k)} />
              ))}
            </ChipGroup>
          </View>
          <Field
            label="名前（必須）"
            value={newName}
            onChangeText={setNewName}
            placeholder={newKind === 'temple' ? '例：〇〇寺' : '例：〇〇神社'}
          />
          <Field label="読み" value={newKana} onChangeText={setNewKana} placeholder={newKind === 'temple' ? '例：まるまるでら' : '例：まるまるじんじゃ'} />
          <Field label="都道府県" value={newPrefecture} onChangeText={setNewPrefecture} placeholder="例：東京都" />
          <LocationButton value={newCoords} onChange={setNewCoords} clearable />
          <View style={styles.addActions}>
            {!noShrinesYet && (
              <Button label="やめる" variant="secondary" onPress={() => setAdding(false)} style={{ flex: 1 }} />
            )}
            <Button
              label="追加して選ぶ"
              onPress={addShrine}
              disabled={!newName.trim()}
              loading={saving}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      ) : (
        <Pressable accessibilityRole="button" onPress={() => setAdding(true)} style={styles.addLink}>
          <Ionicons name="add" size={18} color={colors.accent} />
          <Text style={styles.addLinkLabel}>見つからない場合は手入力で追加</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        data={results ?? []}
        keyExtractor={(s) => s.id}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={
          results !== null && query.trim() !== '' ? (
            <Text style={styles.empty}>「{query.trim()}」に一致する神社・お寺はありません</Text>
          ) : null
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => {
          const selected = draft.shrine?.id === item.id;
          const last = index === (results?.length ?? 0) - 1;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => update({ shrine: { id: item.id, name: item.name, kind: item.kind } })}
              style={[
                styles.row,
                index === 0 && styles.rowFirst,
                last && styles.rowLast,
                selected && styles.rowSelected,
              ]}
            >
              <View style={styles.rowIcon}>
                <PlaceMark kind={item.kind} size={22} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowMeta}>
                  {[
                    item.prefecture,
                    item.visitCount > 0 ? `参拝 ${item.visitCount}回` : null,
                    item.lastVisitedOn ? `最終 ${formatDot(item.lastVisitedOn)}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'まだ参拝の記録はありません'}
                </Text>
              </View>
              {selected ? (
                <View style={styles.check}>
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                </View>
              ) : (
                <View style={styles.radio} />
              )}
            </Pressable>
          );
        }}
      />
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button
          label={draft.shrine ? `次へ：${draft.shrine.name}の御朱印を撮影` : '神社・お寺を選んでください'}
          disabled={!draft.shrine}
          onPress={() => router.push('/record/photo')}
          icon={<Ionicons name="camera-outline" size={20} color="#FFFFFF" />}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  headerBlock: { gap: 18, paddingTop: 8, paddingBottom: 8 },
  search: {
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
  sectionLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  row: {
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  rowFirst: { borderTopWidth: 1, borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md },
  rowLast: { borderBottomLeftRadius: radius.md, borderBottomRightRadius: radius.md },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowSelected: { backgroundColor: colors.accentTint },
  rowName: { fontSize: 16, fontFamily: fonts.bold, color: colors.ink },
  rowMeta: { marginTop: 2, fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.lineStrong },
  empty: { paddingVertical: 16, fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: 'center' },
  addBlock: { marginTop: 16 },
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
  kindGroup: { gap: 8 },
  linked: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkedText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft },
  linkedClear: { fontFamily: fonts.regular, fontSize: 12, color: colors.accent },
  addLink: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  addLinkLabel: { fontSize: 14, fontFamily: fonts.regular, color: colors.accent },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.paper,
  },
});
