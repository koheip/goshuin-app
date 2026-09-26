import { Platform } from 'react-native';

import type { PlaceKind } from '@/db/types';
import type { Coords } from '@/lib/location';

// Google Places API (New) の Text Search で神社・お寺を探す。
// キーはアプリに埋め込まれるので、Google Cloud でアプリと API の制限を必ずかける
const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
const TEXT_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const NEARBY_ENDPOINT = 'https://places.googleapis.com/v1/places:searchNearby';
const FIELD_MASK = 'places.id,places.displayName,places.formattedAddress,places.types';
const BUNDLE_ID = 'com.koheip.goshuin';

export const placesSearchEnabled = Boolean(API_KEY);

export type PlaceCandidate = {
  // 利用規約で保存してよいのは Place ID だけ。住所は選ぶときの表示にだけ使う
  placeId: string;
  name: string;
  address: string;
  kind: PlaceKind;
};

type ApiPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  types?: string[];
  location?: { latitude?: number; longitude?: number };
};

// 近くの神社・お寺。位置は距離の表示と地図を開くときだけに使い、DBには保存しない
export type NearbyPlace = PlaceCandidate & Coords & { distance: number };

export function guessKind(name: string, types: string[] = []): PlaceKind {
  if (types.includes('buddhist_temple')) return 'temple';
  if (types.includes('shinto_shrine')) return 'shrine';
  return /(寺|院|堂|大師|不動尊|観音)$/.test(name) ? 'temple' : 'shrine';
}

export function parsePlaces(json: { places?: ApiPlace[] }): PlaceCandidate[] {
  return (json.places ?? [])
    .filter((p): p is ApiPlace & { id: string } => Boolean(p.id && p.displayName?.text))
    .map((p) => {
      const name = p.displayName!.text!;
      return {
        placeId: p.id,
        name,
        address: (p.formattedAddress ?? '').replace(/^日本、(〒\d{3}-\d{4} )?/, ''),
        kind: guessKind(name, p.types),
      };
    });
}

function requestHeaders(fieldMask: string): Record<string, string> {
  if (!API_KEY) throw new Error('Google Places の APIキーが設定されていません');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': API_KEY,
    'X-Goog-FieldMask': fieldMask,
  };
  // キーを「このアプリからだけ使える」ように制限しているとき、どのアプリからの呼び出しかを伝える
  if (Platform.OS === 'ios') headers['X-Ios-Bundle-Identifier'] = BUNDLE_ID;
  if (Platform.OS === 'android') headers['X-Android-Package'] = BUNDLE_ID;
  return headers;
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceCandidate[]> {
  const res = await fetch(TEXT_ENDPOINT, {
    method: 'POST',
    headers: requestHeaders(FIELD_MASK),
    body: JSON.stringify({ textQuery: query, languageCode: 'ja', regionCode: 'JP', pageSize: 10 }),
    signal,
  });
  if (!res.ok) throw new Error(`検索に失敗しました（${res.status}）`);
  return parsePlaces(await res.json());
}

// 2点間の距離（メートル）。近くの神社を並べる程度なので球として計算する
export function distanceMeters(a: Coords, b: Coords): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)}m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)}km`;
}

export function parseNearbyPlaces(json: { places?: ApiPlace[] }, center: Coords): NearbyPlace[] {
  const byId = new Map((json.places ?? []).map((p) => [p.id, p]));
  return parsePlaces(json)
    .flatMap((place) => {
      const location = byId.get(place.placeId)?.location;
      if (location?.latitude === undefined || location.longitude === undefined) return [];
      const coords = { latitude: location.latitude, longitude: location.longitude };
      return [{ ...place, ...coords, distance: distanceMeters(center, coords) }];
    })
    .sort((a, b) => a.distance - b.distance);
}

// 今いる場所の近くにある神社・お寺を、近い順に最大20件探す
export async function searchNearbyPlaces(center: Coords, radius: number, signal?: AbortSignal): Promise<NearbyPlace[]> {
  const res = await fetch(NEARBY_ENDPOINT, {
    method: 'POST',
    headers: requestHeaders(`${FIELD_MASK},places.location`),
    body: JSON.stringify({
      includedTypes: ['shinto_shrine', 'buddhist_temple'],
      maxResultCount: 20,
      rankPreference: 'DISTANCE',
      locationRestriction: { circle: { center, radius } },
      languageCode: 'ja',
      regionCode: 'JP',
    }),
    signal,
  });
  if (!res.ok) throw new Error(`検索に失敗しました（${res.status}）`);
  return parseNearbyPlaces(await res.json(), center);
}
