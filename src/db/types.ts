// ID は後からクラウド同期しやすいよう UUID、日時は ISO 8601 文字列で持つ

export type PlaceKind = 'shrine' | 'temple';

export type GoshuinKind = 'regular' | 'limited' | 'written';

export const GOSHUIN_KIND_LABEL: Record<GoshuinKind, string> = {
  regular: '通常',
  limited: '限定',
  written: '書き置き',
};

export const WEATHER_OPTIONS = ['晴れ', '曇り', '雨', '雪'] as const;

export type Shrine = {
  id: string;
  name: string;
  kana: string | null;
  prefecture: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  // 地図APIの place ID だけを保存する（詳細データは規約上保存しない）
  placeId: string | null;
  kind: PlaceKind;
  createdAt: string;
  updatedAt: string;
};

export type Visit = {
  id: string;
  shrineId: string;
  visitedOn: string; // YYYY-MM-DD
  weather: string | null;
  companions: string | null;
  omikuji: string | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Book = {
  id: string;
  name: string;
  startedOn: string | null;
  endedOn: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Goshuin = {
  id: string;
  visitId: string;
  bookId: string;
  // 画像はDBに入れず、ドキュメントフォルダ内のファイル名だけを持つ
  imageFile: string;
  kind: GoshuinKind;
  fee: number | null;
  position: number;
  createdAt: string;
  updatedAt: string;
};

// 御朱印帳の表示用に、御朱印・参拝・神社をまとめたもの
export type GoshuinEntry = {
  id: string;
  imageFile: string;
  kind: GoshuinKind;
  fee: number | null;
  visitId: string;
  visitedOn: string;
  weather: string | null;
  companions: string | null;
  omikuji: string | null;
  memo: string | null;
  shrineId: string;
  shrineName: string;
  shrineKana: string | null;
  prefecture: string | null;
};
