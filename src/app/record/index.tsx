import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pressable } from '@/components/Pressable';
import { PlaceMark } from '@/components/shrine';
import { GoogleAttribution } from '@/components/GoogleAttribution';
import { Button, Chip, ChipGroup, Stepper } from '@/components/ui';
import { createShrine, listLinkedShrines, searchShrines, type ShrineWithStats } from '@/db/repo';
import { PLACE_KIND_LABEL, type PlaceKind } from '@/db/types';
import { formatDot } from '@/lib/dates';
import { guessKind, placesSearchEnabled, searchPlaces, type PlaceCandidate } from '@/lib/places';
import { useDraft } from '@/record/draft';
import { colors, radius, fonts } from '@/theme';

// まだ登録していない神社・お寺。「次へ」を押したときに登録する
type NewPlace = { name: string; kind: PlaceKind; placeId: string | null };

export default function SelectShrineScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { draft, update } = useDraft();
  const params = useLocalSearchParams<{ placeId?: string; name?: string; kind?: string }>();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ShrineWithStats[] | null>(null);
  const [googleResults, setGoogleResults] = useState<PlaceCandidate[] | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [newPlace, setNewPlace] = useState<NewPlace | null>(null);
  const [saving, setSaving] = useState(false);
  const abort = useRef<AbortController | null>(null);

  // 近くの神社から来たときは、つなげた神社があれば選び、なければ新しい場所として選んでおく
  useEffect(() => {
    if (!params.placeId || !params.name) return;
    const { placeId, name } = params;
    const kind: PlaceKind = params.kind === 'temple' ? 'temple' : 'shrine';
    let active = true;
    listLinkedShrines(db).then((rows) => {
      if (!active) return;
      const shrine = rows.find((r) => r.placeId === placeId);
      if (shrine) update({ shrine: { id: shrine.id, name: shrine.name, kind: shrine.kind } });
      else setNewPlace({ name, kind, placeId });
    });
    return () => {
      active = false;
    };
    // 開いたときに1回だけ反映する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let active = true;
    searchShrines(db, query).then((rows) => {
      if (active) setResults(rows);
    });
    return () => {
      active = false;
    };
  }, [db, query]);

  function changeQuery(text: string) {
    setQuery(text);
    abort.current?.abort();
    setGoogleResults(null);
    setGoogleLoading(false);
    setGoogleError(null);
  }

  async function searchGoogle() {
    const q = query.trim();
    if (!q || !placesSearchEnabled) return;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setGoogleLoading(true);
    setGoogleError(null);
    try {
      setGoogleResults(await searchPlaces(q, controller.signal));
    } catch (e) {
      if (!controller.signal.aborted) setGoogleError(e instanceof Error ? e.message : String(e));
    } finally {
      if (abort.current === controller) setGoogleLoading(false);
    }
  }

  function selectShrine(shrine: ShrineWithStats) {
    setNewPlace(null);
    update({ shrine: { id: shrine.id, name: shrine.name, kind: shrine.kind } });
  }

  async function selectNew(place: NewPlace) {
    // Google の場所をもう登録してあれば、それを選ぶ
    const existing = place.placeId ? (await listLinkedShrines(db)).find((s) => s.placeId === place.placeId) : undefined;
    if (existing) return selectShrine(existing);
    update({ shrine: null });
    setNewPlace(place);
  }

  async function next() {
    if (newPlace) {
      setSaving(true);
      try {
        const shrine = await createShrine(db, newPlace);
        update({ shrine: { id: shrine.id, name: shrine.name, kind: shrine.kind } });
        setNewPlace(null);
        setResults(await searchShrines(db, query));
      } catch (e) {
        Alert.alert('追加できませんでした', String(e));
        return;
      } finally {
        setSaving(false);
      }
    }
    update({ recordMode: 'visit' });
    router.push('/record/memo');
  }

  const trimmed = query.trim();
  const noShrinesYet = results !== null && results.length === 0 && trimmed === '';

  const header = (
    <View style={styles.headerBlock}>
      <Stepper current={1} />
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={changeQuery}
          onSubmitEditing={searchGoogle}
          placeholder="神社・お寺の名前を入力"
          placeholderTextColor={colors.placeholder}
          accessibilityLabel="神社・お寺の名前で探す"
          style={styles.searchInput}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable accessibilityRole="button" accessibilityLabel="入力を消す" hitSlop={8} onPress={() => changeQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.placeholder} />
          </Pressable>
        )}
      </View>
      {newPlace && trimmed === '' && (
        <NewPlaceRow place={newPlace} onKind={newPlace.placeId ? undefined : (kind) => setNewPlace({ ...newPlace, kind })} />
      )}
      {noShrinesYet && !newPlace && <Text style={styles.hint}>参拝した神社・お寺の名前を入力してください</Text>}
      {results && results.length > 0 && <Text style={styles.sectionLabel}>{trimmed ? '記録した神社・お寺' : 'これまでに記録した神社・お寺'}</Text>}
    </View>
  );

  const footer = trimmed ? (
    <View style={styles.footer}>
      {googleResults === null && placesSearchEnabled && (
        <Pressable accessibilityRole="button" onPress={searchGoogle} disabled={googleLoading} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          {googleLoading ? <ActivityIndicator color={colors.accent} /> : <Ionicons name="search" size={18} color={colors.accent} />}
          <Text style={styles.actionLabel}>「{trimmed}」を Google で探す</Text>
        </Pressable>
      )}
      {googleError && <Text style={styles.error}>{googleError}</Text>}
      {googleResults && googleResults.length > 0 && (
        <View>
          <Text style={[styles.sectionLabel, styles.sectionGap]}>Google で見つかった場所</Text>
          {googleResults.map((place, index) => (
            <Row
              key={place.placeId}
              kind={place.kind}
              name={place.name}
              meta={place.address}
              first={index === 0}
              last={index === googleResults.length - 1}
              selected={newPlace?.placeId === place.placeId}
              onPress={() => selectNew({ name: place.name, kind: place.kind, placeId: place.placeId })}
            />
          ))}
          <GoogleAttribution places={googleResults} style={styles.attribution} />
        </View>
      )}
      {googleResults?.length === 0 && <Text style={styles.hint}>Google では見つかりませんでした</Text>}
      {newPlace && !newPlace.placeId ? (
        <NewPlaceRow place={newPlace} onKind={(kind) => setNewPlace({ ...newPlace, kind })} />
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => selectNew({ name: trimmed, kind: guessKind(trimmed), placeId: null })}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Ionicons name="add" size={18} color={colors.accent} />
          <Text style={styles.actionLabel}>「{trimmed}」を新しく追加</Text>
        </Pressable>
      )}
    </View>
  ) : null;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        data={results ?? []}
        keyExtractor={(s) => s.id}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <Row
            kind={item.kind}
            name={item.name}
            meta={
              [
                item.prefecture,
                item.visitCount > 0 ? `参拝 ${item.visitCount}回` : null,
                item.lastVisitedOn ? `最終 ${formatDot(item.lastVisitedOn)}` : null,
              ]
                .filter(Boolean)
                .join(' · ') || 'まだ参拝の記録はありません'
            }
            first={index === 0}
            last={index === (results?.length ?? 0) - 1}
            selected={draft.shrine?.id === item.id}
            onPress={() => selectShrine(item)}
          />
        )}
      />
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button
          label="次へ：参拝内容を入力"
          disabled={!draft.shrine && !newPlace}
          loading={saving}
          onPress={next}
          icon={<Ionicons name="footsteps-outline" size={20} color="#FFFFFF" />}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function Row({ kind, name, meta, first, last, selected, onPress }: {
  kind: PlaceKind;
  name: string;
  meta: string;
  first: boolean;
  last: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.row, first && styles.rowFirst, last && styles.rowLast, selected && styles.rowSelected]}
    >
      <View style={styles.rowIcon}>
        <PlaceMark kind={kind} size={22} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.rowName} numberOfLines={1}>{name}</Text>
        {meta ? <Text style={styles.rowMeta} numberOfLines={1}>{meta}</Text> : null}
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
}

// 新しく追加する場所。手入力のときだけ神社かお寺かを選べる
function NewPlaceRow({ place, onKind }: { place: NewPlace; onKind?: (kind: PlaceKind) => void }) {
  return (
    <View style={styles.newPlace}>
      <Row kind={place.kind} name={place.name} meta="新しく追加します" first last selected onPress={() => {}} />
      {onKind && (
        <ChipGroup>
          {(Object.keys(PLACE_KIND_LABEL) as PlaceKind[]).map((k) => (
            <Chip key={k} label={PLACE_KIND_LABEL[k]} selected={place.kind === k} onPress={() => onKind(k)} />
          ))}
        </ChipGroup>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  headerBlock: { gap: 16, paddingTop: 8, paddingBottom: 8 },
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
  sectionGap: { marginBottom: 8 },
  hint: { paddingVertical: 8, fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: 'center' },
  error: { fontFamily: fonts.regular, fontSize: 12, color: colors.danger },
  row: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  newPlace: { gap: 10 },
  footer: { marginTop: 16, gap: 12 },
  action: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionLabel: { flexShrink: 1, fontSize: 14, fontFamily: fonts.regular, color: colors.accent },
  pressed: { opacity: 0.7 },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.paper,
  },
  attribution: { marginTop: 6 },
});
