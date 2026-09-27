import { AppleMaps, GoogleMaps } from 'expo-maps';
import { Platform, StyleSheet } from 'react-native';

import type { MappedPlace } from '@/db/repo';
import { PLACE_KIND_LABEL } from '@/db/types';
import { colors } from '@/theme';

type Props = {
  places: MappedPlace[];
  onSelect: (place: MappedPlace) => void;
  onDeselect?: () => void;
};

const kawaiiMapStyle = JSON.stringify([
  { elementType: 'geometry', stylers: [{ color: '#F7EEFA' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6D5A8E' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFF9FD' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#DECFF0' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#EFE9FA' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#F9E2F0' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#DCF3E9' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#FFF7FC' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#F7CFE5' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#E8DBF6' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#CDEBFA' }] },
]);

// expo-maps は Expo Go に入っていないので、この部品は開発ビルドでだけ読み込む
export default function PlacesMap({ places, onSelect, onDeselect }: Props) {
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
        uiSettings={{ compassEnabled: true, myLocationButtonEnabled: true, scaleBarEnabled: false }}
        onMapClick={onDeselect ? () => onDeselect() : undefined}
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
        showCallout: false,
      }))}
      properties={{ isBuildingEnabled: false, isIndoorEnabled: false, selectionEnabled: false, mapStyleOptions: { json: kawaiiMapStyle } }}
      uiSettings={{ compassEnabled: true, mapToolbarEnabled: false, myLocationButtonEnabled: true, zoomControlsEnabled: false }}
      contentPadding={{ top: 116, end: 12, bottom: 176, start: 12 }}
      onMapClick={onDeselect ? () => onDeselect() : undefined}
      onMarkerClick={(marker) => select(marker.id)}
    />
  );
}

// ピン全体の真ん中あたりを最初に映す
function centerOf(places: MappedPlace[]) {
  // 記録がまだない最初の起動でも、コンセプト通り地図そのものを表示する。
  if (places.length === 0) return { latitude: 35.681236, longitude: 139.767125 };
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
