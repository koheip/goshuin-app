import { Platform } from 'react-native';

import type { PlaceKind } from '@/db/types';

// Google Places API (New) の Text Search で神社・お寺を探す。
// キーはアプリに埋め込まれるので、Google Cloud でアプリと API の制限を必ずかける
const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
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
};

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

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceCandidate[]> {
  if (!API_KEY) throw new Error('Google Places の APIキーが設定されていません');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': API_KEY,
    'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.types',
  };
  // キーを「このアプリからだけ使える」ように制限しているとき、どのアプリからの呼び出しかを伝える
  if (Platform.OS === 'ios') headers['X-Ios-Bundle-Identifier'] = BUNDLE_ID;
  if (Platform.OS === 'android') headers['X-Android-Package'] = BUNDLE_ID;

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ textQuery: query, languageCode: 'ja', regionCode: 'JP', pageSize: 10 }),
    signal,
  });
  if (!res.ok) throw new Error(`検索に失敗しました（${res.status}）`);
  return parsePlaces(await res.json());
}
