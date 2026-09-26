import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, StyleSheet, Text, View } from 'react-native';

import { PlaceMark } from '@/components/shrine';
import { Button, Chip, ChipGroup } from '@/components/ui';
import { listLinkedShrines, type ShrineWithStats } from '@/db/repo';
import { PLACE_KIND_LABEL } from '@/db/types';
import { getCurrentCoords, LocationPermissionError } from '@/lib/location';
import { openInGoogleMaps } from '@/lib/maps';
import { formatDistance, placesSearchEnabled, searchNearbyPlaces, type NearbyPlace } from '@/lib/places';
import { colors, fonts, glow, radius } from '@/theme';

const RADIUS_OPTIONS = [1000, 3000, 10000] as const;
const DEFAULT_RADIUS = 3000;

type Failure = { kind: 'permission' } | { kind: 'error'; message: string };

export default function NearbyScreen() {
  const db = useSQLiteContext();
  const [searchRadius, setSearchRadius] = useState<number>(DEFAULT_RADIUS);
  const [places, setPlaces] = useState<NearbyPlace[] | null>(null);
  const [linked, setLinked] = useState<Map<string, ShrineWithStats>>(new Map());
  const [loading, setLoading] = useState(placesSearchEnabled);
  const [failure, setFailure] = useState<Failure | null>(null);
  const abort = useRef<AbortController | null>(null);

  // 現在地を取ってから探す。表示の切り替えは呼び出し側（search）で先に行う
  const run = useCallback((meters: number) => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    getCurrentCoords()
      .then((center) => searchNearbyPlaces(center, meters, controller.signal))
      .then((found) => {
        if (!controller.signal.aborted) setPlaces(found);
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setFailure(
          e instanceof LocationPermissionError
            ? { kind: 'permission' }
            : { kind: 'error', message: e instanceof Error ? e.message : String(e) },
        );
      })
      .finally(() => {
        if (abort.current === controller) setLoading(false);
      });
  }, []);

  function search(meters: number) {
    setSearchRadius(meters);
    setLoading(true);
    setFailure(null);
    run(meters);
  }

  useEffect(() => {
    if (placesSearchEnabled) run(DEFAULT_RADIUS);
    return () => abort.current?.abort();
  }, [run]);

  // 記録から戻ってきたときに「記録済み」を更新する
  useFocusEffect(
    useCallback(() => {
      let active = true;
      listLinkedShrines(db).then((rows) => {
        if (active) setLinked(new Map(rows.map((r) => [r.placeId!, r])));
      });
      return () => {
        active = false;
      };
    }, [db]),
  );

  if (!placesSearchEnabled) {
    return (
      <Message
        title="近くの神社を探すには準備が必要です"
        body="Google Places の APIキーを .env の EXPO_PUBLIC_GOOGLE_PLACES_API_KEY に設定すると使えるようになります。"
      />
    );
  }

  const header = (
    <View style={styles.header}>
      <ChipGroup>
        {RADIUS_OPTIONS.map((m) => (
          <Chip key={m} label={`${m / 1000}km 以内`} selected={searchRadius === m} onPress={() => search(m)} />
        ))}
      </ChipGroup>
      {places && places.length > 0 && <Text style={styles.sub}>今いる場所から近い順に並んでいます</Text>}
    </View>
  );

  return (
    <FlatList
      style={styles.screen}
      data={failure ? [] : (places ?? [])}
      keyExtractor={(p) => p.placeId}
      contentContainerStyle={styles.list}
      ListHeaderComponent={header}
      refreshing={loading && places !== null}
      onRefresh={() => search(searchRadius)}
      ListEmptyComponent={
        failure?.kind === 'permission' ? (
          <Message
            title="位置情報の使用が許可されていません"
            body="設定アプリから許可すると、今いる場所の近くの神社・お寺を探せます。"
            action={<Button label="設定を開く" variant="secondary" onPress={() => Linking.openSettings()} />}
          />
        ) : failure ? (
          <Message
            title="探せませんでした"
            body={`電波の届く場所で、もう一度お試しください。\n（${failure.message}）`}
            action={<Button label="もう一度探す" variant="secondary" onPress={() => search(searchRadius)} />}
          />
        ) : places === null || loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.sub}>近くの神社・お寺を探しています…</Text>
          </View>
        ) : (
          <Message
            title="近くに見つかりませんでした"
            body="探す範囲を広げてみてください。"
          />
        )
      }
      ListFooterComponent={places && places.length > 0 && !failure ? <Text style={styles.attribution}>Google Maps</Text> : null}
      renderItem={({ item }) => <NearbyCard place={item} shrine={linked.get(item.placeId)} />}
    />
  );
}

function NearbyCard({ place, shrine }: { place: NearbyPlace; shrine?: ShrineWithStats }) {
  async function openMap() {
    try {
      await openInGoogleMaps({ ...place, prefecture: null });
    } catch {
      Alert.alert('地図を開けませんでした', 'Google マップまたはブラウザを確認してください。');
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <PlaceMark kind={place.kind} size={32} />
        <View style={styles.flex}>
          <Text style={styles.cardName} numberOfLines={1}>
            {place.name}
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {[PLACE_KIND_LABEL[place.kind], formatDistance(place.distance), place.address].filter(Boolean).join(' · ')}
          </Text>
        </View>
        {shrine && shrine.visitCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>参拝 {shrine.visitCount}回</Text>
          </View>
        )}
      </View>
      <View style={styles.cardActions}>
        <Button
          label="参拝を記録"
          onPress={() =>
            router.push({ pathname: '/record', params: { placeId: place.placeId, name: place.name, kind: place.kind } })
          }
          style={styles.flex}
        />
        <Button
          label="Google マップ"
          variant="secondary"
          onPress={openMap}
          icon={<Ionicons name="navigate-outline" size={18} color={colors.ink} />}
          style={styles.flex}
        />
      </View>
    </View>
  );
}

function Message({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <View style={styles.message}>
      <PlaceMark kind="shrine" size={56} />
      <Text style={styles.messageTitle}>{title}</Text>
      <Text style={styles.messageBody}>{body}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.paper },
  list: { padding: 16, gap: 12 },
  header: { gap: 10, marginBottom: 4 },
  sub: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  loading: { alignItems: 'center', paddingTop: 40, gap: 12 },
  card: {
    gap: 12,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    boxShadow: glow.soft,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardName: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },
  cardMeta: { marginTop: 2, fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  cardActions: { flexDirection: 'row', gap: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: colors.accentTint },
  badgeText: { fontFamily: fonts.bold, fontSize: 11, color: colors.accent },
  message: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 40, gap: 12 },
  messageTitle: { fontSize: 16, fontFamily: fonts.bold, color: colors.ink, textAlign: 'center' },
  messageBody: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.muted, textAlign: 'center' },
  attribution: { textAlign: 'right', fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
});
