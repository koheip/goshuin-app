import { AppleMaps, GoogleMaps } from 'expo-maps';
import { Platform, StyleSheet } from 'react-native';

import type { MappedPlace } from '@/db/repo';
import { PLACE_KIND_LABEL } from '@/db/types';
import { colors } from '@/theme';

type Props = {
  places: MappedPlace[];
  onSelect: (place: MappedPlace) => void;
};

// expo-maps は Expo Go に入っていないので、この部品は開発ビルドでだけ読み込む
export default function PlacesMap({ places, onSelect }: Props) {
  const center = centerOf(places);
  const cameraPosition = { coordinates: center, zoom: places.length > 1 ? 9 : 14 };
  const select = (id?: string) => {
    const place = places.find((p) => p.id === id);
    if (place) onSelect(place);
  };

  if (Platform.OS === 'ios') {
    return (
      <AppleMaps.View
        style={styles.map}
        cameraPosition={cameraPosition}
        markers={places.map((p) => ({
          id: p.id,
          coordinates: { latitude: p.latitude, longitude: p.longitude },
          title: p.name,
          tintColor: p.kind === 'temple' ? colors.violet : colors.shu,
          systemImage: p.kind === 'temple' ? 'building.columns.fill' : 'star.fill',
        }))}
        onMarkerClick={(marker) => select(marker.id)}
      />
    );
  }

  return (
    <GoogleMaps.View
      style={styles.map}
      cameraPosition={cameraPosition}
      markers={places.map((p) => ({
        id: p.id,
        coordinates: { latitude: p.latitude, longitude: p.longitude },
        title: p.name,
        snippet: PLACE_KIND_LABEL[p.kind],
      }))}
      onMarkerClick={(marker) => select(marker.id)}
    />
  );
}

// ピン全体の真ん中あたりを最初に映す
function centerOf(places: MappedPlace[]) {
  const lat = places.map((p) => p.latitude);
  const lng = places.map((p) => p.longitude);
  return {
    latitude: (Math.min(...lat) + Math.max(...lat)) / 2,
    longitude: (Math.min(...lng) + Math.max(...lng)) / 2,
  };
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
