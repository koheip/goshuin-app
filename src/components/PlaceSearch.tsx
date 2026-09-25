import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PlaceMark } from '@/components/shrine';
import { searchPlaces, type PlaceCandidate } from '@/lib/places';
import { colors, fonts, radius } from '@/theme';

// Google で神社・お寺を検索し、選んだ候補を返す
export function PlaceSearch({ onPick }: { onPick: (place: PlaceCandidate) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceCandidate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  async function search() {
    const q = query.trim();
    if (!q) return;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setLoading(true);
    setError(null);
    try {
      setResults(await searchPlaces(q, controller.signal));
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (abort.current === controller) setLoading(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.search}>
        <Ionicons name="logo-google" size={16} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          placeholder="Google で探す（例：明治神宮）"
          placeholderTextColor={colors.placeholder}
          accessibilityLabel="Google で神社・お寺を探す"
          returnKeyType="search"
          style={styles.input}
        />
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel="検索" hitSlop={8} onPress={search}>
            <Ionicons name="search" size={18} color={colors.accent} />
          </Pressable>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {results?.length === 0 && <Text style={styles.muted}>見つかりませんでした。名前を変えて探すか、下に手入力してください。</Text>}
      {results && results.length > 0 && (
        <View style={styles.results}>
          {results.map((place, i) => (
            <Pressable
              key={place.placeId}
              accessibilityRole="button"
              onPress={() => {
                onPick(place);
                setResults(null);
              }}
              style={({ pressed }) => [styles.row, i > 0 && styles.rowBorder, pressed && { backgroundColor: colors.track }]}
            >
              <PlaceMark kind={place.kind} size={24} />
              <View style={styles.flex}>
                <Text style={styles.name} numberOfLines={1}>
                  {place.name}
                </Text>
                <Text style={styles.muted} numberOfLines={1}>
                  {place.address}
                </Text>
              </View>
            </Pressable>
          ))}
          <Text style={styles.attribution}>Google Maps</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { gap: 8 },
  search: {
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    backgroundColor: colors.paper,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  results: { borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  row: { minHeight: 56, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  name: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  muted: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  error: { fontFamily: fonts.regular, fontSize: 12, color: colors.danger },
  attribution: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    textAlign: 'right',
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.muted,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
