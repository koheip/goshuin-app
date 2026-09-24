import type { SQLiteDatabase } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';

const LATEST_VERSION = 1;

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

  await db.execAsync(`PRAGMA user_version = ${version}`);
}
