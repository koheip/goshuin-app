import type { SQLiteDatabase } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';

const LATEST_VERSION = 3;

// PRAGMA user_version でスキーマの版を管理し、足りない分だけ順に適用する
export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  // foreign_keys は接続ごとの設定なので、毎回の起動時に有効にする
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  if (version >= LATEST_VERSION) return;

  if (version === 0) {
    await db.execAsync(`
      CREATE TABLE shrines (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        kana TEXT,
        prefecture TEXT,
        address TEXT,
        latitude REAL,
        longitude REAL,
        place_id TEXT,
        kind TEXT NOT NULL DEFAULT 'shrine',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE visits (
        id TEXT PRIMARY KEY NOT NULL,
        shrine_id TEXT NOT NULL REFERENCES shrines(id),
        visited_on TEXT NOT NULL,
        weather TEXT,
        companions TEXT,
        omikuji TEXT,
        memo TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE books (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        started_on TEXT,
        ended_on TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE goshuin (
        id TEXT PRIMARY KEY NOT NULL,
        visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
        book_id TEXT NOT NULL REFERENCES books(id),
        image_file TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'regular',
        fee INTEGER,
        position INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX idx_visits_shrine ON visits(shrine_id);
      CREATE INDEX idx_goshuin_book ON goshuin(book_id);
      CREATE INDEX idx_goshuin_visit ON goshuin(visit_id);
    `);

    const now = new Date().toISOString();
    await db.runAsync(
      'INSERT INTO books (id, name, started_on, ended_on, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?)',
      randomUUID(),
      '壱の帳',
      now.slice(0, 10),
      now,
      now,
    );
    version = 1;
  }

  if (version === 1) {
    // 版2：goshuin.position を「参拝の中の順番」から「帳の中の並び順」に変える
    await renumberGoshuinPositions(db);
    version = 2;
  }

  if (version === 2) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS avatar_preferences (
        id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
        blessing TEXT NOT NULL DEFAULT 'amaterasu',
        equipment_json TEXT NOT NULL DEFAULT '["magatama","omamori","shide","haori"]',
        updated_at TEXT NOT NULL
      );
    `);
    await db.runAsync(
      'INSERT OR IGNORE INTO avatar_preferences (id, blessing, equipment_json, updated_at) VALUES (1, ?, ?, ?)',
      'amaterasu',
      JSON.stringify(['magatama', 'omamori', 'shide', 'haori']),
      new Date().toISOString(),
    );
    version = 3;
  }

  await db.execAsync(`PRAGMA user_version = ${version}`);
}

// 帳ごとに、参拝日の古い順で position を 0 から振り直す
export async function renumberGoshuinPositions(db: SQLiteDatabase) {
  await db.execAsync(`
    UPDATE goshuin SET position = (
      SELECT r.rn FROM (
        SELECT g.id,
          ROW_NUMBER() OVER (
            PARTITION BY g.book_id ORDER BY v.visited_on, v.created_at, g.position
          ) - 1 AS rn
        FROM goshuin g JOIN visits v ON v.id = g.visit_id
      ) r
      WHERE r.id = goshuin.id
    );
  `);
}
