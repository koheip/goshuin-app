import Ionicons from '@expo/vector-icons/Ionicons';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BLESSINGS, type BlessingId } from '@/avatar/catalog';
import { PixelAvatar } from '@/components/AvatarPreview';
import { KamiLoadingScreen } from '@/components/KamiLoadingScreen';
import { PlaceMark } from '@/components/shrine';
import { DreamyBackground } from '@/components/ui';
import { getAvatarPreferences, listMappedPlaces, type MappedPlace } from '@/db/repo';
import { PLACE_KIND_LABEL } from '@/db/types';
import { openInGoogleMaps } from '@/lib/maps';
import { placesSearchEnabled } from '@/lib/places';
import { colors, fonts, glow, radius } from '@/theme';

type MapFilter = 'all' | 'shrine' | 'temple' | 'unvisited';
const FILTERS: { value: MapFilter; label: string }[] = [
  { value: 'all', label: 'すべて' }, { value: 'shrine', label: '神社' },
  { value: 'temple', label: 'お寺' }, { value: 'unvisited', label: '未参拝' },
];

const MAP_AVAILABLE = Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
const PlacesMap = MAP_AVAILABLE ? lazy(() => import('@/components/PlacesMap')) : null;
const PIN_POSITIONS = [
  { top: '20%', left: '12%' },
  { top: '25%', left: '60%' },
  { top: '39%', left: '24%' },
  { top: '46%', left: '68%' },
] as const;

export default function MapScreen() {
  const db = useSQLiteContext();
  const [places, setPlaces] = useState<MappedPlace[] | null>(null);
  const [selected, setSelected] = useState<MappedPlace | null>(null);
  const [filter, setFilter] = useState<MapFilter>('all');
  const [guideId, setGuideId] = useState<BlessingId>('amaterasu');

  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([listMappedPlaces(db), getAvatarPreferences(db)]).then(([rows, preferences]) => {
      if (!active) return;
      setPlaces(rows);
      setSelected((current) => rows.find((place) => place.id === current?.id) ?? rows[0] ?? null);
      if (BLESSINGS.some((item) => item.id === preferences.blessing)) setGuideId(preferences.blessing as BlessingId);
    });
    return () => { active = false; };
  }, [db]));

  const visiblePlaces = useMemo(() => (places ?? []).filter((place) => visibleForFilter(place, filter)), [filter, places]);

  function changeFilter(next: MapFilter) {
    setFilter(next);
    setSelected((current) => current && visibleForFilter(current, next) ? current : null);
  }

  function openNearby() {
    if (placesSearchEnabled) router.push('/nearby');
    else Alert.alert('検索の準備中です', '近くの神社・お寺の検索設定を確認してください。');
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {places === null ? (
        <><DreamyBackground /><KamiLoadingScreen variant="loading" message="めぐった場所を結んでいます…" /></>
      ) : PlacesMap ? (
        <View style={styles.mapWrap}>
          <Suspense fallback={<KamiLoadingScreen variant="loading" message="地図をひらいています…" />}>
            <PlacesMap places={visiblePlaces} onSelect={setSelected} onDeselect={() => setSelected(null)} />
          </Suspense>
          <Image source={require('../../../assets/map-kawaii-overworld.png')} resizeMode="cover" style={styles.mapArtwork} />
          <View pointerEvents="box-none" style={styles.illustratedPins}>
            {PIN_POSITIONS.map((position, index) => {
              const place = visiblePlaces[index];
              return (
                <Pressable
                  key={place?.id ?? `nearby-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={place ? `${place.name}を表示` : '近くの神社を探す'}
                  onPress={() => place ? setSelected(place) : openNearby()}
                  style={({ pressed }) => [styles.illustratedPin, position, pressed && styles.pressed]}
                >
                  <View style={styles.pinHalo} />
                  <PlaceMark kind={place?.kind ?? 'shrine'} size={36} />
                </Pressable>
              );
            })}
          </View>
          <View pointerEvents="none" accessibilityElementsHidden style={styles.avatarMarker}>
            <View style={styles.avatarShadow} />
            <PixelAvatar blessing={BLESSINGS.find((item) => item.id === guideId) ?? BLESSINGS[0]} equipment={[]} size={86} />
            <View style={styles.currentLocationDot} />
          </View>
          <MapHeader filter={filter} onFilter={changeFilter} onSearch={openNearby} floating />
          <View pointerEvents="box-none" style={[styles.mapActions, (selected || visiblePlaces.length === 0) && styles.mapActionsRaised]}>
            <Pressable accessibilityRole="button" accessibilityLabel="現在地の近くの神社を探す" onPress={openNearby} style={({ pressed }) => [styles.roundMapAction, pressed && styles.pressed]}>
              <Ionicons name="locate" size={22} color={colors.violet} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="近くの神社を探す" onPress={openNearby} style={({ pressed }) => [styles.mapAction, pressed && styles.pressed]}>
              <Ionicons name="navigate" size={17} color="#FFFFFF" /><Text style={styles.mapActionText}>近くを探す</Text>
            </Pressable>
          </View>
          {visiblePlaces.length === 0 && <MapPromptCard onSearch={openNearby} />}
          {selected && visibleForFilter(selected, filter) && <PlaceCard place={selected} onClose={() => setSelected(null)} />}
        </View>
      ) : (
        <View style={styles.fallback}>
          <DreamyBackground />
          <MapHeader filter={filter} onFilter={changeFilter} onSearch={openNearby} />
          <FlatList data={visiblePlaces} keyExtractor={(place) => place.id} contentContainerStyle={styles.list}
            ListHeaderComponent={<Text style={styles.notice}>アプリ内地図は開発ビルドまたはストア版で表示されます。ここでは場所を選んでGoogleマップで開けます。</Text>}
            ListEmptyComponent={<Text style={styles.noResultsText}>この条件の場所はまだありません</Text>}
            renderItem={({ item }) => <PlaceCard place={item} />} />
        </View>
      )}
    </SafeAreaView>
  );
}

function MapPromptCard({ onSearch }: { onSearch: () => void }) {
  return (
    <View style={[styles.card, styles.cardFloating, styles.promptCard]}>
      <View style={styles.cardHead}>
        <View style={styles.cardThumb}><PlaceMark kind="shrine" size={42} /></View>
        <View style={styles.flex}>
          <Text style={styles.cardName}>近くの神社を探す</Text>
          <Text style={styles.cardMeta}>現在地から、新しいご縁を見つけよう</Text>
        </View>
      </View>
      <Pressable accessibilityRole="button" onPress={onSearch} style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}>
        <Text style={styles.primaryActionText}>探してみる</Text><Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

function visibleForFilter(place: MappedPlace, filter: MapFilter) {
  if (filter === 'unvisited') return place.visitCount === 0;
  if (filter === 'shrine' || filter === 'temple') return place.kind === filter;
  return true;
}

function MapHeader({ filter, onFilter, onSearch, floating = false }: { filter: MapFilter; onFilter: (filter: MapFilter) => void; onSearch: () => void; floating?: boolean }) {
  return (
    <View pointerEvents="box-none" style={[styles.header, floating && styles.headerFloating]}>
      <Pressable accessibilityRole="button" accessibilityLabel="このエリアの神社やお寺を検索" onPress={onSearch} style={({ pressed }) => [styles.search, pressed && styles.pressed]}>
        <Ionicons name="search" size={19} color={colors.violet} /><Text style={styles.searchText}>このエリアを検索</Text><Ionicons name="chevron-forward" size={17} color={colors.placeholder} />
      </Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {FILTERS.map((item) => <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected: filter === item.value }} onPress={() => onFilter(item.value)} style={[styles.filter, filter === item.value && styles.filterActive]}><Text style={[styles.filterText, filter === item.value && styles.filterTextActive]}>{item.label}</Text></Pressable>)}
      </ScrollView>
    </View>
  );
}

function PlaceCard({ place, onClose }: { place: MappedPlace; onClose?: () => void }) {
  async function openMap() {
    try { await openInGoogleMaps(place); }
    catch { Alert.alert('地図を開けませんでした', 'Googleマップまたはブラウザを確認してください。'); }
  }

  return (
    <View style={[styles.card, onClose && styles.cardFloating]}>
      <View style={styles.cardHead}>
        <View style={styles.cardThumb}><PlaceMark kind={place.kind} size={44} /></View>
        <View style={styles.flex}><View style={styles.cardTitleRow}><Text style={styles.cardName} numberOfLines={1}>{place.name}</Text>{place.visitCount > 0 && <Ionicons name="heart" size={13} color={colors.accent} />}</View><Text style={styles.cardMeta}>{[PLACE_KIND_LABEL[place.kind], place.prefecture, place.visitCount > 0 ? `参拝 ${place.visitCount}回` : '未参拝'].filter(Boolean).join('  ·  ')}</Text></View>
        {onClose && <Pressable accessibilityRole="button" accessibilityLabel="閉じる" hitSlop={10} onPress={onClose} style={styles.close}><Ionicons name="close" size={20} color={colors.muted} /></Pressable>}
      </View>
      <View style={styles.tags}><View style={styles.tag}><Text style={styles.tagText}>{place.kind === 'shrine' ? 'ご神縁スポット' : '仏縁スポット'}</Text></View>{place.latestGoshuinId && <View style={styles.tag}><Text style={styles.tagText}>御朱印あり</Text></View>}</View>
      <View style={styles.cardActions}>
        {place.latestGoshuinId && <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/goshuin/[id]', params: { id: place.latestGoshuinId! } })} style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}><Ionicons name="book-outline" size={17} color={colors.accentOnTint} /><Text style={styles.secondaryActionText}>御朱印</Text></Pressable>}
        <Pressable accessibilityRole="button" onPress={openMap} style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}><Text style={styles.primaryActionText}>ここに行く</Text><Ionicons name="arrow-forward" size={17} color="#FFFFFF" /></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, screen: { flex: 1, backgroundColor: colors.paper }, mapWrap: { flex: 1, overflow: 'hidden', backgroundColor: '#EEE9FF' }, fallback: { flex: 1 }, mapArtwork: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%', opacity: .93 }, illustratedPins: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 2, elevation: 2 }, illustratedPin: { position: 'absolute', width: 68, height: 68, alignItems: 'center', justifyContent: 'center', borderRadius: 34, backgroundColor: 'rgba(255,255,255,.88)', borderWidth: 3, borderColor: 'rgba(255,255,255,.96)', boxShadow: glow.pink }, pinHalo: { position: 'absolute', width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,158,211,.24)', borderWidth: 1, borderColor: 'rgba(235,70,143,.28)' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, gap: 10 }, headerFloating: { position: 'absolute', zIndex: 5, elevation: 5, top: 0, left: 0, right: 0, paddingTop: 14 },
  search: { minHeight: 48, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 24, backgroundColor: 'rgba(255,255,255,.94)', borderWidth: 1, borderColor: 'rgba(255,255,255,.98)', boxShadow: glow.soft }, searchText: { flex: 1, fontFamily: fonts.bold, fontSize: 13, color: colors.muted },
  filters: { gap: 8, paddingHorizontal: 1 }, filter: { minWidth: 67, height: 34, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: 'rgba(255,255,255,.92)', borderWidth: 1, borderColor: colors.line }, filterActive: { backgroundColor: colors.accent, borderColor: colors.accent, boxShadow: glow.pink }, filterText: { fontFamily: fonts.bold, fontSize: 11, color: colors.inkSoft }, filterTextActive: { color: '#FFFFFF' },
  avatarMarker: { position: 'absolute', zIndex: 3, elevation: 3, left: '50%', top: '43%', width: 72, height: 92, marginLeft: -36, alignItems: 'center', justifyContent: 'flex-end' }, avatarImage: { position: 'absolute', top: 0, width: 72, height: 84 }, avatarShadow: { position: 'absolute', bottom: 5, width: 44, height: 11, borderRadius: 22, backgroundColor: 'rgba(92,65,145,.20)' }, currentLocationDot: { position: 'absolute', bottom: 0, width: 11, height: 11, borderRadius: 6, backgroundColor: colors.violet, borderWidth: 3, borderColor: '#FFFFFF', boxShadow: glow.soft },
  mapActions: { position: 'absolute', zIndex: 4, elevation: 4, right: 14, bottom: 18, alignItems: 'flex-end', gap: 9 }, mapActionsRaised: { bottom: 184 }, roundMapAction: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: 'rgba(255,255,255,.96)', borderWidth: 2, borderColor: '#FFFFFF', boxShadow: glow.soft }, mapAction: { minHeight: 42, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 21, backgroundColor: colors.accent, borderWidth: 1, borderColor: 'rgba(255,255,255,.8)', boxShadow: glow.pink }, mapActionText: { fontFamily: fonts.bold, fontSize: 10, color: '#FFFFFF' }, pressed: { opacity: .72, transform: [{ scale: .98 }] },
  noResults: { position: 'absolute', top: '48%', alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 11, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.94)', boxShadow: glow.soft }, noResultsText: { fontFamily: fonts.bold, fontSize: 12, color: colors.muted, textAlign: 'center' },
  list: { padding: 16, gap: 12 }, notice: { marginBottom: 4, fontFamily: fonts.regular, fontSize: 12, lineHeight: 19, color: colors.inkSoft },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, paddingBottom: 60, gap: 12 }, emptyMark: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center', borderRadius: 56, backgroundColor: 'rgba(255,255,255,.72)', borderWidth: 1, borderColor: colors.lineStrong, boxShadow: glow.pink }, emptyTitle: { marginTop: 6, fontFamily: fonts.display, fontSize: 18, color: colors.ink }, emptyBody: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 20, color: colors.muted, textAlign: 'center' }, emptySearch: { marginTop: 6, minHeight: 46, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 23, backgroundColor: colors.accent, boxShadow: glow.pink }, emptySearchText: { fontFamily: fonts.bold, fontSize: 12, color: '#FFFFFF' },
  card: { gap: 11, padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: 'rgba(255,255,255,.97)', boxShadow: glow.strong }, cardFloating: { position: 'absolute', zIndex: 6, elevation: 6, left: 12, right: 12, bottom: 12 }, promptCard: { paddingVertical: 12 }, cardHead: { flexDirection: 'row', alignItems: 'center', gap: 11 }, cardThumb: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 15, backgroundColor: colors.accentTint, borderWidth: 1, borderColor: colors.lineStrong }, cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, cardName: { flexShrink: 1, fontFamily: fonts.display, fontSize: 17, color: colors.ink }, cardMeta: { marginTop: 4, fontFamily: fonts.regular, fontSize: 10, color: colors.muted }, close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: colors.track },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, tag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: colors.accentTint }, tagText: { fontFamily: fonts.bold, fontSize: 9, color: colors.accentOnTint }, cardActions: { flexDirection: 'row', gap: 8 }, primaryAction: { flex: 1, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 21, backgroundColor: colors.accent, boxShadow: glow.pink }, primaryActionText: { fontFamily: fonts.bold, fontSize: 12, color: '#FFFFFF' }, secondaryAction: { minWidth: 92, minHeight: 42, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 21, backgroundColor: colors.accentTint, borderWidth: 1, borderColor: colors.lineStrong }, secondaryActionText: { fontFamily: fonts.bold, fontSize: 11, color: colors.accentOnTint },
});
