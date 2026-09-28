import type { SQLiteDatabase } from 'expo-sqlite';
import { Directory, File, Paths } from 'expo-file-system';

import { renumberGoshuinPositions } from '@/db/migrate';

import { imageDir, isImageFileName } from './images';

// バックアップは1つの JSON ファイル。DBの行をそのまま持ち、写真は base64 で埋め込む
const FORMAT = 'goshuin-app-backup';
// 版2から goshuin.position は帳の中の並び順（版1は参拝の中の順番）
// 版4からアバターと設定も入れる
// 版5から神社のお気に入り（shrines.favorited_at）も入れる
const FORMAT_VERSION = 5;

// 復元時に書き込む列。テーブルの定義（db/migrate.ts）と合わせる
const TABLES = {
  shrines: [
    'id', 'name', 'kana', 'prefecture', 'address', 'latitude', 'longitude',
    'place_id', 'kind', 'lineage', 'favorited_at', 'created_at', 'updated_at',
  ],
  books: ['id', 'name', 'started_on', 'ended_on', 'created_at', 'updated_at'],
  visits: [
    'id', 'shrine_id', 'visited_on', 'weather', 'companions', 'omikuji', 'memo',
    'created_at', 'updated_at',
  ],
  goshuin: [
    'id', 'visit_id', 'book_id', 'image_file', 'kind', 'fee', 'position',
    'created_at', 'updated_at',
  ],
  visit_photos: ['id', 'visit_id', 'image_file', 'position', 'created_at'],
  avatar_preferences: ['id', 'blessing', 'equipment_json', 'updated_at'],
  app_settings: ['key', 'value', 'updated_at'],
} as const;

type TableName = keyof typeof TABLES;
type RecordTable = 'shrines' | 'books' | 'visits' | 'goshuin' | 'visit_photos';
type SettingsTable = Exclude<TableName, RecordTable>;
type Row = Record<string, string | number | null>;

type Backup = {
  format: typeof FORMAT;
  version: number;
  exportedAt: string;
  // 設定のテーブルは版4から。版3以前のファイルにはない
  tables: Record<RecordTable, Row[]> & Partial<Record<SettingsTable, Row[]>>;
  images: Record<string, string>;
};

// 親→子の順。削除はこの逆順で行う
const INSERT_ORDER: RecordTable[] = ['shrines', 'books', 'visits', 'goshuin', 'visit_photos'];
const SETTINGS_TABLES: SettingsTable[] = ['avatar_preferences', 'app_settings'];

// 端末ごとの設定は書き出さず、戻すときも今の端末の値を残す。
// リマインダーの通知IDはその端末でしか使えず、上書きすると予約中の通知を止められなくなる
const DEVICE_SETTINGS = ['visit_reminder'];
const isDeviceSetting = (row: Row) => DEVICE_SETTINGS.includes(String(row.key));

export class BackupFormatError extends Error {}

// すべての記録と写真を1つのファイルに書き出し、そのファイルを返す
export async function exportBackup(db: SQLiteDatabase): Promise<File> {
  const tables = {} as Backup['tables'];
  for (const name of [...INSERT_ORDER, ...SETTINGS_TABLES]) {
    tables[name] = await db.getAllAsync<Row>(`SELECT ${TABLES[name].join(', ')} FROM ${name}`);
  }
  tables.app_settings = tables.app_settings?.filter((row) => !isDeviceSetting(row));

  const images: Record<string, string> = {};
  for (const row of tables.goshuin) {
    const fileName = String(row.image_file);
    const file = new File(imageDir(), fileName);
    if (file.exists) images[fileName] = await file.base64();
  }
  for (const row of tables.visit_photos) {
    const fileName = String(row.image_file);
    const file = new File(imageDir(), fileName);
    if (file.exists) images[fileName] = await file.base64();
  }

  const backup: Backup = {
    format: FORMAT,
    version: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    tables,
    images,
  };

  const stamp = backup.exportedAt.slice(0, 10).replaceAll('-', '');
  const dir = new Directory(Paths.cache, 'backup');
  if (dir.exists) dir.delete();
  dir.create({ intermediates: true });
  const out = new File(dir, `goshuin-backup-${stamp}.json`);
  out.create();
  out.write(JSON.stringify(backup));
  return out;
}

function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupFormatError('ファイルを読み取れませんでした');
  }
  const b = data as Partial<Backup> | null;
  if (!b || b.format !== FORMAT || typeof b.tables !== 'object' || typeof b.images !== 'object') {
    throw new BackupFormatError('このアプリのバックアップファイルではありません');
  }
  if (typeof b.version !== 'number' || b.version > FORMAT_VERSION) {
    throw new BackupFormatError('新しい版のアプリで作られたバックアップです。アプリを更新してください');
  }
  if (b.version < 3 && b.tables && !('visit_photos' in b.tables)) {
    (b.tables as Record<string, Row[]>).visit_photos = [];
  }
  for (const name of INSERT_ORDER) {
    if (!Array.isArray(b.tables[name])) throw new BackupFormatError('バックアップの中身が壊れています');
  }
  for (const name of SETTINGS_TABLES) {
    const rows = b.tables[name];
    if (rows !== undefined && !Array.isArray(rows)) throw new BackupFormatError('バックアップの中身が壊れています');
  }
  if (b.tables.books.length === 0) throw new BackupFormatError('バックアップに御朱印帳がありません');
  // 写真フォルダの外へ書き出したり、記録を消すときに外のファイルを消したりしないよう、ファイル名の形を確かめる
  const imageFiles = [
    ...Object.keys(b.images),
    ...[...b.tables.goshuin, ...b.tables.visit_photos].map((row) => row.image_file),
  ];
  if (!imageFiles.every(isImageFileName)) throw new BackupFormatError('バックアップの中身が壊れています');
  return b as Backup;
}

// バックアップの内容で、今の記録と写真をすべて置き換える。復元した御朱印の枚数を返す
export async function restoreBackup(db: SQLiteDatabase, uri: string): Promise<number> {
  const backup = parseBackup(await new File(uri).text());
  const dir = imageDir();

  // 先に写真を書き出す。DBの置き換えに失敗したら、新しく書いた分だけ消す
  const written: File[] = [];
  try {
    for (const [fileName, base64] of Object.entries(backup.images)) {
      const file = new File(dir, fileName);
      if (file.exists) continue;
      file.create();
      file.write(base64, { encoding: 'base64' });
      written.push(file);
    }

    await db.withTransactionAsync(async () => {
      for (const name of [...INSERT_ORDER].reverse()) {
        await db.runAsync(`DELETE FROM ${name}`);
      }
      for (const name of INSERT_ORDER) {
        await insertRows(db, name, backup.tables[name]);
      }
      if (backup.version < 2) await renumberGoshuinPositions(db);

      // 設定がないファイル（版3以前）なら、今の端末の設定をそのまま使う
      for (const name of SETTINGS_TABLES) {
        const rows = backup.tables[name];
        if (!rows) continue;
        if (name === 'app_settings') {
          await db.runAsync(
            `DELETE FROM app_settings WHERE key NOT IN (${DEVICE_SETTINGS.map(() => '?').join(', ')})`,
            DEVICE_SETTINGS,
          );
          await insertRows(db, name, rows.filter((row) => !isDeviceSetting(row)));
        } else {
          await db.runAsync(`DELETE FROM ${name}`);
          await insertRows(db, name, rows);
        }
      }
    });
  } catch (e) {
    written.forEach((f) => f.exists && f.delete());
    throw e;
  }

  // どの記録からも使われなくなった写真を片付ける
  const keep = new Set(
    [...backup.tables.goshuin, ...backup.tables.visit_photos].map((row) => String(row.image_file)),
  );
  for (const entry of dir.list()) {
    if (entry instanceof File && !keep.has(entry.name)) entry.delete();
  }
  return backup.tables.goshuin.length;
}

async function insertRows(db: SQLiteDatabase, name: TableName, rows: Row[]) {
  const columns = TABLES[name];
  const sql = `INSERT INTO ${name} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
  for (const row of rows) {
    await db.runAsync(sql, columns.map((c) => row[c] ?? null));
  }
}
