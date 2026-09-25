import { Linking } from 'react-native';

type MapTarget = {
  name: string;
  prefecture: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
};

// Google マップの Maps URLs（APIキー不要）。
// 端末にマップアプリがあればアプリで、なければブラウザで開かれる
export function googleMapsUrl(target: MapTarget): string {
  const query =
    target.latitude !== null && target.longitude !== null
      ? `${target.latitude},${target.longitude}`
      : [target.name, target.address ?? target.prefecture].filter(Boolean).join(' ');
  let url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  if (target.placeId) url += `&query_place_id=${encodeURIComponent(target.placeId)}`;
  return url;
}

export function openInGoogleMaps(target: MapTarget): Promise<void> {
  return Linking.openURL(googleMapsUrl(target));
}
