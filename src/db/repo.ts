import type { SQLiteDatabase } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';

import type { Book, BookWithStats, GoshuinEntry, GoshuinKind, PlaceKind, Shrine } from './types';

export type ShrineWithStats = Shrine & {
  visitCount: number;
  lastVisitedOn: string | null;
};

export type JourneyStats = {
  visitCount: number;
  shrineCount: number;
  goshuinCount: number;
};

export type AvatarPreferences = {
  blessing: string;
  equipment: string[];
};

export async function getAvatarPreferences(db: SQLiteDatabase): Promise<AvatarPreferences> {
  const row = await db.getFirstAsync<{ blessing: string; equipmentJson: string }>(
    'SELECT blessing, equipment_json AS equipmentJson FROM avatar_preferences WHERE id = 1',
  );
  if (!row) return { blessing: 'amaterasu', equipment: ['magatama', 'omamori', 'shide', 'haori'] };
  try {
    const equipment = JSON.parse(row.equipmentJson);
      return { blessing: row.blessing, equipment: Array.isArray(equipment) ? equipment : [] };
  } catch {
    return { blessing: row.blessing, equipment: [] };
  }
}

export async function saveAvatarPreferences(db: SQLiteDatabase, preferences: AvatarPreferences): Promise<void> {
  await db.runAsync(
    `INSERT INTO avatar_preferences (id, blessing, equipment_json, updated_at)
     VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET blessing = excluded.blessing,
       equipment_json = excluded.equipment_json, updated_at = excluded.updated_at`,
    preferences.blessing,
    JSON.stringify(preferences.equipment),
    new Date().toISOString(),
  );
}

export async function isTutorialComplete(db: SQLiteDatabase): Promise<boolean> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    'tutorial_complete',
  );
  return row?.value === '1';
}

export async function setTutorialComplete(db: SQLiteDatabase, complete: boolean): Promise<void> {
  await db.runAsync(
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    'tutorial_complete',
    complete ? '1' : '0',
    new Date().toISOString(),
  );
}

export type ReminderPreferences = {
  enabled: boolean;
  weekday: number;
  hour: number;
  minute: number;
  notificationId: string | null;
};

const defaultReminder: ReminderPreferences = { enabled: false, weekday: 7, hour: 9, minute: 0, notificationId: null };

export async function getReminderPreferences(db: SQLiteDatabase): Promise<ReminderPreferences> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    'visit_reminder',
  );
  if (!row) return defaultReminder;
  try {
    return { ...defaultReminder, ...JSON.parse(row.value) };
  } catch {
    return defaultReminder;
  }
}

export async function saveReminderPreferences(db: SQLiteDatabase, preferences: ReminderPreferences): Promise<void> {
  await db.runAsync(
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    'visit_reminder',
    JSON.stringify(preferences),
    new Date().toISOString(),
  );
}

// HOME・図鑑などで使う、これまでのめぐり全体の集計
export async function getJourneyStats(db: SQLiteDatabase): Promise<JourneyStats> {
  return (
    (await db.getFirstAsync<JourneyStats>(
      `SELECT
        (SELECT COUNT(*) FROM visits) AS visitCount,
        (SELECT COUNT(DISTINCT shrine_id) FROM visits) AS shrineCount,
        (SELECT COUNT(*) FROM goshuin) AS goshuinCount`,
    )) ?? { visitCount: 0, shrineCount: 0, goshuinCount: 0 }
  );
}

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
  input: {
    name: string;
    kana?: string;
    prefecture?: string;
    kind?: PlaceKind;
    latitude?: number | null;
    longitude?: number | null;
    placeId?: string | null;
  },
): Promise<Shrine> {
  const now = new Date().toISOString();
  const shrine: Shrine = {
    id: randomUUID(),
    name: input.name.trim(),
    kana: input.kana?.trim() || null,
    prefecture: input.prefecture?.trim() || null,
    address: null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    placeId: input.placeId ?? null,
    kind: input.kind ?? 'shrine',
    createdAt: now,
    updatedAt: now,
  };
  await db.runAsync(
    `INSERT INTO shrines (id, name, kana, prefecture, address, latitude, longitude, place_id, kind, created_at, updated_at)
     VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
    shrine.id,
    shrine.name,
    shrine.kana,
    shrine.prefecture,
    shrine.latitude,
    shrine.longitude,
    shrine.placeId,
    shrine.kind,
    now,
    now,
  );
  return shrine;
}

const BOOK_COLUMNS = `
  b.id, b.name, b.started_on AS startedOn, b.ended_on AS endedOn,
  b.created_at AS createdAt, b.updated_at AS updatedAt
`;

// 今記録している帳（まだ閉じていない帳のうち、いちばん新しいもの）
export async function getCurrentBook(db: SQLiteDatabase): Promise<Book> {
  const book = await db.getFirstAsync<Book>(
    `SELECT ${BOOK_COLUMNS} FROM books b
     ORDER BY b.ended_on IS NOT NULL, b.created_at DESC, b.rowid DESC LIMIT 1`,
  );
  if (!book) throw new Error('御朱印帳が見つかりません');
  return book;
}

export async function getBook(db: SQLiteDatabase, bookId: string): Promise<Book | null> {
  return db.getFirstAsync<Book>(`SELECT ${BOOK_COLUMNS} FROM books b WHERE b.id = ?`, bookId);
}

// 帳を新しい順に、枚数と参拝の期間を添えて返す
export async function listBooks(db: SQLiteDatabase): Promise<BookWithStats[]> {
  return db.getAllAsync<BookWithStats>(
    `SELECT ${BOOK_COLUMNS},
       COUNT(g.id) AS goshuinCount,
       MIN(v.visited_on) AS firstVisitedOn,
       MAX(v.visited_on) AS lastVisitedOn
     FROM books b
     LEFT JOIN goshuin g ON g.book_id = b.id
     LEFT JOIN visits v ON v.id = g.visit_id
     GROUP BY b.id
     ORDER BY b.created_at DESC, b.rowid DESC`,
  );
}

// 今の帳を閉じて、次の帳を始める。これからの記録は新しい帳に綴じられる
export async function startNewBook(db: SQLiteDatabase, name: string, startedOn: string): Promise<Book> {
  const now = new Date().toISOString();
  const book: Book = {
    id: randomUUID(),
    name: name.trim(),
    startedOn,
    endedOn: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE books SET ended_on = ?, updated_at = ? WHERE ended_on IS NULL',
      startedOn,
      now,
    );
    await db.runAsync(
      'INSERT INTO books (id, name, started_on, ended_on, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?)',
      book.id,
      book.name,
      book.startedOn,
      now,
      now,
    );
  });
  return book;
}

export async function renameBook(db: SQLiteDatabase, bookId: string, name: string): Promise<void> {
  await db.runAsync(
    'UPDATE books SET name = ?, updated_at = ? WHERE id = ?',
    name.trim(),
    new Date().toISOString(),
    bookId,
  );
}

// 帳の中の並び順を、渡された御朱印IDの順に振り直す
export async function reorderBook(db: SQLiteDatabase, bookId: string, goshuinIds: string[]): Promise<void> {
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const [position, id] of goshuinIds.entries()) {
      await db.runAsync(
        'UPDATE goshuin SET position = ?, updated_at = ? WHERE id = ? AND book_id = ?',
        position,
        now,
        id,
        bookId,
      );
    }
  });
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
    // 新しい御朱印は帳の最後のページに綴じる
    const last = await db.getFirstAsync<{ maxPosition: number | null }>(
      'SELECT MAX(position) AS maxPosition FROM goshuin WHERE book_id = ?',
      bookId,
    );
    const start = (last?.maxPosition ?? -1) + 1;
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
    for (const [i, g] of input.goshuin.entries()) {
      await db.runAsync(
        `INSERT INTO goshuin (id, visit_id, book_id, image_file, kind, fee, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        randomUUID(),
        visitId,
        bookId,
        g.imageFile,
        g.kind,
        g.fee,
        start + i,
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
    s.id AS shrineId, s.name AS shrineName, s.kana AS shrineKana, s.kind AS shrineKind, s.prefecture,
    s.address, s.latitude, s.longitude, s.place_id AS placeId
  FROM goshuin g
  JOIN visits v ON v.id = g.visit_id
  JOIN shrines s ON s.id = v.shrine_id
`;

// 帳面の並び順に並べる
export async function listBookEntries(db: SQLiteDatabase, bookId: string): Promise<GoshuinEntry[]> {
  return db.getAllAsync<GoshuinEntry>(
    `${ENTRY_SELECT} WHERE g.book_id = ? ORDER BY g.position, g.created_at`,
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

export type EntryUpdate = {
  visitedOn: string;
  weather: string | null;
  companions: string | null;
  omikuji: string | null;
  memo: string | null;
  kind: GoshuinKind;
  fee: number | null;
};

// 参拝の内容（同じ参拝の御朱印すべてに共通）と、この御朱印の種類・初穂料を書き換える
export async function updateEntry(db: SQLiteDatabase, goshuinId: string, input: EntryUpdate): Promise<void> {
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE visits SET visited_on = ?, weather = ?, companions = ?, omikuji = ?, memo = ?, updated_at = ?
       WHERE id = (SELECT visit_id FROM goshuin WHERE id = ?)`,
      input.visitedOn,
      input.weather,
      input.companions,
      input.omikuji,
      input.memo,
      now,
      goshuinId,
    );
    await db.runAsync(
      'UPDATE goshuin SET kind = ?, fee = ?, updated_at = ? WHERE id = ?',
      input.kind,
      input.fee,
      now,
      goshuinId,
    );
  });
}

export async function setShrineLocation(
  db: SQLiteDatabase,
  shrineId: string,
  coords: { latitude: number; longitude: number },
): Promise<void> {
  await db.runAsync(
    'UPDATE shrines SET latitude = ?, longitude = ?, updated_at = ? WHERE id = ?',
    coords.latitude,
    coords.longitude,
    new Date().toISOString(),
    shrineId,
  );
}

export type MappedPlace = ShrineWithStats & {
  latitude: number;
  longitude: number;
  // 地図から開く、いちばん新しい御朱印
  latestGoshuinId: string | null;
};

// 位置が登録されている神社・お寺を、参拝回数と最新の御朱印つきで返す
export async function listMappedPlaces(db: SQLiteDatabase): Promise<MappedPlace[]> {
  return db.getAllAsync<MappedPlace>(
    `SELECT ${SHRINE_COLUMNS},
       COUNT(DISTINCT v.id) AS visitCount,
       MAX(v.visited_on) AS lastVisitedOn,
       (SELECT g.id FROM goshuin g JOIN visits v2 ON v2.id = g.visit_id
        WHERE v2.shrine_id = s.id
        ORDER BY v2.visited_on DESC, g.created_at DESC LIMIT 1) AS latestGoshuinId
     FROM shrines s
     LEFT JOIN visits v ON v.shrine_id = s.id
     WHERE s.latitude IS NOT NULL AND s.longitude IS NOT NULL
     GROUP BY s.id
     ORDER BY lastVisitedOn IS NULL, lastVisitedOn DESC`,
  );
}
