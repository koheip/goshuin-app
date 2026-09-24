import type { SQLiteDatabase } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';

import type { Book, GoshuinEntry, GoshuinKind, Shrine } from './types';

export type ShrineWithStats = Shrine & {
  visitCount: number;
  lastVisitedOn: string | null;
};

const SHRINE_COLUMNS = `
  s.id, s.name, s.kana, s.prefecture, s.address, s.latitude, s.longitude,
  s.place_id AS placeId, s.kind, s.created_at AS createdAt, s.updated_at AS updatedAt
`;

// 登録済みの神社を名前・読みで検索する。最近参拝した順に並べる
export async function searchShrines(db: SQLiteDatabase, query: string): Promise<ShrineWithStats[]> {
  const q = query.trim();
  const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return db.getAllAsync<ShrineWithStats>(
    `SELECT ${SHRINE_COLUMNS},
       COUNT(v.id) AS visitCount,
       MAX(v.visited_on) AS lastVisitedOn
     FROM shrines s
     LEFT JOIN visits v ON v.shrine_id = s.id
     WHERE ? = '' OR s.name LIKE ? ESCAPE '\\' OR s.kana LIKE ? ESCAPE '\\'
     GROUP BY s.id
     ORDER BY lastVisitedOn IS NULL, lastVisitedOn DESC, s.created_at DESC
     LIMIT 50`,
    q,
    like,
    like,
  );
}

export async function createShrine(
  db: SQLiteDatabase,
  input: { name: string; kana?: string; prefecture?: string },
): Promise<Shrine> {
  const now = new Date().toISOString();
  const shrine: Shrine = {
    id: randomUUID(),
    name: input.name.trim(),
    kana: input.kana?.trim() || null,
    prefecture: input.prefecture?.trim() || null,
    address: null,
    latitude: null,
    longitude: null,
    placeId: null,
    kind: 'shrine',
    createdAt: now,
    updatedAt: now,
  };
  await db.runAsync(
    `INSERT INTO shrines (id, name, kana, prefecture, address, latitude, longitude, place_id, kind, created_at, updated_at)
     VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?, ?)`,
    shrine.id,
    shrine.name,
    shrine.kana,
    shrine.prefecture,
    shrine.kind,
    now,
    now,
  );
  return shrine;
}

export async function getCurrentBook(db: SQLiteDatabase): Promise<Book> {
  const book = await db.getFirstAsync<Book>(
    `SELECT id, name, started_on AS startedOn, ended_on AS endedOn,
       created_at AS createdAt, updated_at AS updatedAt
     FROM books ORDER BY created_at DESC LIMIT 1`,
  );
  if (!book) throw new Error('御朱印帳が見つかりません');
  return book;
}

export type NewVisit = {
  shrineId: string;
  visitedOn: string;
  weather: string | null;
  companions: string | null;
  omikuji: string | null;
  memo: string | null;
  goshuin: { imageFile: string; kind: GoshuinKind; fee: number | null }[];
};

// 1回の参拝と、その参拝で授かった御朱印をまとめて保存する
export async function saveVisit(db: SQLiteDatabase, bookId: string, input: NewVisit): Promise<string> {
  const now = new Date().toISOString();
  const visitId = randomUUID();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO visits (id, shrine_id, visited_on, weather, companions, omikuji, memo, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      visitId,
      input.shrineId,
      input.visitedOn,
      input.weather,
      input.companions,
      input.omikuji,
      input.memo,
      now,
      now,
    );
    for (const [position, g] of input.goshuin.entries()) {
      await db.runAsync(
        `INSERT INTO goshuin (id, visit_id, book_id, image_file, kind, fee, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        randomUUID(),
        visitId,
        bookId,
        g.imageFile,
        g.kind,
        g.fee,
        position,
        now,
        now,
      );
    }
  });
  return visitId;
}

const ENTRY_SELECT = `
  SELECT g.id, g.image_file AS imageFile, g.kind, g.fee,
    v.id AS visitId, v.visited_on AS visitedOn, v.weather, v.companions, v.omikuji, v.memo,
    s.id AS shrineId, s.name AS shrineName, s.kana AS shrineKana, s.prefecture
  FROM goshuin g
  JOIN visits v ON v.id = g.visit_id
  JOIN shrines s ON s.id = v.shrine_id
`;

// 帳面の順（参拝日の古い順）に並べる
export async function listBookEntries(db: SQLiteDatabase, bookId: string): Promise<GoshuinEntry[]> {
  return db.getAllAsync<GoshuinEntry>(
    `${ENTRY_SELECT} WHERE g.book_id = ? ORDER BY v.visited_on, v.created_at, g.position`,
    bookId,
  );
}

export async function getEntry(db: SQLiteDatabase, goshuinId: string): Promise<GoshuinEntry | null> {
  return db.getFirstAsync<GoshuinEntry>(`${ENTRY_SELECT} WHERE g.id = ?`, goshuinId);
}

// 御朱印を1枚削除する。参拝に御朱印が残らなければ参拝の記録も消す
export async function deleteGoshuin(db: SQLiteDatabase, goshuinId: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ visitId: string; imageFile: string }>(
    'SELECT visit_id AS visitId, image_file AS imageFile FROM goshuin WHERE id = ?',
    goshuinId,
  );
  if (!row) return null;
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM goshuin WHERE id = ?', goshuinId);
    await db.runAsync(
      'DELETE FROM visits WHERE id = ? AND NOT EXISTS (SELECT 1 FROM goshuin WHERE visit_id = ?)',
      row.visitId,
      row.visitId,
    );
  });
  return row.imageFile;
}
