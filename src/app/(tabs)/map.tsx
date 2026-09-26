import Ionicons from '@expo/vector-icons/Ionicons';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { lazy, Suspense, useCallback, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlaceMark } from '@/components/shrine';
import { KamiLoadingScreen } from '@/components/KamiLoadingScreen';
import { Button, DreamyBackground, ScreenTitle } from '@/components/ui';
import { listMappedPlaces, type MappedPlace } from '@/db/repo';
import { PLACE_KIND_LABEL } from '@/db/types';
import { formatDot } from '@/lib/dates';
import { openInGoogleMaps } from '@/lib/maps';
import { placesSearchEnabled } from '@/lib/places';
import { colors, fonts, glow, radius } from '@/theme';

// アプリ内の地図は開発ビルドだけで使える（Expo Go と Web には expo-maps が入っていない）
const MAP_AVAILABLE =
  Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
const PlacesMap = MAP_AVAILABLE ? lazy(() => import('@/components/PlacesMap')) : null;

export default function MapScreen() {
  const db = useSQLiteContext();
  const [places, setPlaces] = useState<MappedPlace[] | null>(null);
  const [selected, setSelected] = useState<MappedPlace | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      listMappedPlaces(db).then((rows) => {
        if (!active) return;
        setPlaces(rows);
        setSelected((s) => rows.find((r) => r.id === s?.id) ?? null);
      });
      return () => {
        active = false;
      };
    }, [db]),
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <DreamyBackground />
      <View style={styles.header}>
        <ScreenTitle>地図</ScreenTitle>
        <Text style={styles.sub}>位置を記録した神社・お寺が並びます</Text>
        {placesSearchEnabled && (
          <Button
            label="近くの神社・お寺を探す"
            variant="secondary"
            onPress={() => router.push('/nearby')}
            icon={<Ionicons name="compass-outline" size={18} color={colors.ink} />}
            style={styles.nearby}
          />
        )}
      </View>

      {places === null ? <KamiLoadingScreen variant="loading" message="めぐった場所を結んでいます…" /> : places.length === 0 ? (
        <View style={styles.empty}>
          <PlaceMark kind="shrine" size={64} />
          <Text style={styles.emptyTitle}>まだ地図に並ぶ場所はありません</Text>
          <Text style={styles.emptyBody}>
            参拝の記録で神社・お寺を追加するときや、記録の編集画面で「今いる場所を記録」を押すと、ここに並びます。
          </Text>
        </View>
      ) : PlacesMap ? (
        <View style={styles.mapWrap}>
          <Suspense fallback={null}>
            <PlacesMap places={places} onSelect={setSelected} />
          </Suspense>
          {selected && <PlaceCard place={selected} onClose={() => setSelected(null)} />}
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.notice}>
              アプリ内の地図は、開発ビルドやストア版のアプリで表示されます。ここでは Google マップで1か所ずつ開けます。
            </Text>
          }
          renderItem={({ item }) => <PlaceCard place={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function PlaceCard({ place, onClose }: { place: MappedPlace; onClose?: () => void }) {
  async function openMap() {
    try {
      await openInGoogleMaps(place);
    } catch {
      Alert.alert('地図を開けませんでした', 'Google マップまたはブラウザを確認してください。');
    }
  }

  return (
    <View style={[styles.card, onClose && styles.cardFloating]}>
      <View style={styles.cardHead}>
        <PlaceMark kind={place.kind} size={32} />
        <View style={styles.flex}>
          <Text style={styles.cardName} numberOfLines={1}>
            {place.name}
          </Text>
          <Text style={styles.cardMeta}>
            {[
              PLACE_KIND_LABEL[place.kind],
              place.prefecture,
              place.visitCount > 0 ? `参拝 ${place.visitCount}回` : null,
              place.lastVisitedOn ? `最終 ${formatDot(place.lastVisitedOn)}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
        {onClose && (
          <Pressable accessibilityRole="button" accessibilityLabel="閉じる" hitSlop={10} onPress={onClose}>
            <Ionicons name="close" size={22} color={colors.muted} />
          </Pressable>
        )}
      </View>
      <View style={styles.cardActions}>
        {place.latestGoshuinId && (
          <Button
            label="御朱印を見る"
            onPress={() => router.push({ pathname: '/goshuin/[id]', params: { id: place.latestGoshuinId! } })}
            style={styles.flex}
          />
        )}
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.paper },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, gap: 4 },
  sub: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  nearby: { marginTop: 8 },
  mapWrap: { flex: 1, overflow: 'hidden', borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  list: { padding: 16, gap: 12 },
  notice: { marginBottom: 4, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.inkSoft },
  card: {
    gap: 12,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    boxShadow: glow.soft,
  },
  cardFloating: { position: 'absolute', left: 12, right: 12, bottom: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardName: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },
  cardMeta: { marginTop: 2, fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  cardActions: { flexDirection: 'row', gap: 10 },
  empty: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 40, gap: 12 },
  emptyTitle: { fontSize: 16, fontFamily: fonts.bold, color: colors.ink },
  emptyBody: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.muted, textAlign: 'center' },
});
