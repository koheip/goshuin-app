import type { SQLiteDatabase } from 'expo-sqlite';
import { Directory, File, Paths } from 'expo-file-system';

import { imageDir } from './images';

// バックアップは1つの JSON ファイル。DBの行をそのまま持ち、写真は base64 で埋め込む
const FORMAT = 'goshuin-app-backup';
const FORMAT_VERSION = 1;

// 復元時に書き込む列。テーブルの定義（db/migrate.ts）と合わせる
const TABLES = {
  shrines: [
    'id', 'name', 'kana', 'prefecture', 'address', 'latitude', 'longitude',
    'place_id', 'kind', 'created_at', 'updated_at',
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
} as const;

type TableName = keyof typeof TABLES;
type Row = Record<string, string | number | null>;

type Backup = {
  format: typeof FORMAT;
  version: number;
  exportedAt: string;
  tables: Record<TableName, Row[]>;
  images: Record<string, string>;
};

// 親→子の順。削除はこの逆順で行う
const INSERT_ORDER: TableName[] = ['shrines', 'books', 'visits', 'goshuin'];

const IMAGE_NAME = /^[0-9a-f-]+\.jpg$/i;

export class BackupFormatError extends Error {}

// すべての記録と写真を1つのファイルに書き出し、そのファイルを返す
export async function exportBackup(db: SQLiteDatabase): Promise<File> {
  const tables = {} as Record<TableName, Row[]>;
  for (const name of INSERT_ORDER) {
    tables[name] = await db.getAllAsync<Row>(`SELECT ${TABLES[name].join(', ')} FROM ${name}`);
  }

  const images: Record<string, string> = {};
  for (const row of tables.goshuin) {
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
  for (const name of INSERT_ORDER) {
    if (!Array.isArray(b.tables[name])) throw new BackupFormatError('バックアップの中身が壊れています');
  }
  if (b.tables.books.length === 0) throw new BackupFormatError('バックアップに御朱印帳がありません');
  for (const fileName of Object.keys(b.images)) {
    // 写真フォルダの外へ書き出されないよう、ファイル名の形を確かめる
    if (!IMAGE_NAME.test(fileName)) throw new BackupFormatError('バックアップの中身が壊れています');
  }
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
        const columns = TABLES[name];
        const sql = `INSERT INTO ${name} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
        for (const row of backup.tables[name]) {
          await db.runAsync(sql, columns.map((c) => row[c] ?? null));
        }
      }
    });
  } catch (e) {
    written.forEach((f) => f.exists && f.delete());
    throw e;
  }

  // どの記録からも使われなくなった写真を片付ける
  const keep = new Set(backup.tables.goshuin.map((row) => String(row.image_file)));
  for (const entry of dir.list()) {
    if (entry instanceof File && !keep.has(entry.name)) entry.delete();
  }
  return backup.tables.goshuin.length;
}
