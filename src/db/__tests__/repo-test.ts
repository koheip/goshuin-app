/// <reference types="jest" />

import type { SQLiteDatabase } from 'expo-sqlite';

import { migrateDbIfNeeded } from '../migrate';
import {
  createShrine,
  deleteGoshuin,
  getCurrentBook,
  getEntry,
  getAvatarPreferences,
  getJourneyStats,
  getReminderPreferences,
  listBookEntries,
  listBooks,
  listMappedPlaces,
  renameBook,
  reorderBook,
  saveVisit,
  searchShrines,
  saveAvatarPreferences,
  saveReminderPreferences,
  setShrineLocation,
  startNewBook,
  updateEntry,
  type NewVisit,
} from '../repo';
import { createTestDb } from '@/testing/testDb';

jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual('crypto').randomUUID() }));

let db: SQLiteDatabase;

beforeEach(async () => {
  db = createTestDb();
  await migrateDbIfNeeded(db);
});

function visit(shrineId: string, visitedOn: string, files: string[]): NewVisit {
  return {
    shrineId,
    visitedOn,
    weather: null,
    companions: null,
    omikuji: null,
    memo: null,
    goshuin: files.map((imageFile) => ({ imageFile, kind: 'regular', fee: 500 })),
  };
}

async function fileOrder(bookId: string) {
  return (await listBookEntries(db, bookId)).map((e) => e.imageFile);
}

describe('migrateDbIfNeeded', () => {
  it('最初の起動で「壱の帳」を作る', async () => {
    const book = await getCurrentBook(db);
    expect(book.name).toBe('壱の帳');
    expect(book.endedOn).toBeNull();
  });

  it('2回目以降は何もしない', async () => {
    await migrateDbIfNeeded(db);
    expect(await listBooks(db)).toHaveLength(1);
  });

  it('アバターの初期設定を作り、変更を保存できる', async () => {
    expect(await getAvatarPreferences(db)).toEqual({
      blessing: 'amaterasu',
      equipment: ['magatama', 'omamori', 'shide', 'haori'],
    });
    await saveAvatarPreferences(db, { blessing: 'susanoo', equipment: ['magatama', 'sakaki'] });
    expect(await getAvatarPreferences(db)).toEqual({ blessing: 'susanoo', equipment: ['magatama', 'sakaki'] });
  });

  it('参拝リマインダーの設定を保存できる', async () => {
    expect(await getReminderPreferences(db)).toEqual({ enabled: false, weekday: 7, hour: 9, minute: 0, notificationId: null });
    await saveReminderPreferences(db, { enabled: true, weekday: 2, hour: 8, minute: 30, notificationId: 'reminder-1' });
    expect(await getReminderPreferences(db)).toEqual({ enabled: true, weekday: 2, hour: 8, minute: 30, notificationId: 'reminder-1' });
  });

  it('版1のデータは、参拝日の古い順に帳の並び順を振り直す', async () => {
    const book = await getCurrentBook(db);
    const shrine = await createShrine(db, { name: '一の宮' });
    // 版1の保存のしかた（position は参拝の中の順番）を再現する
    await saveVisit(db, book.id, visit(shrine.id, '2025-05-01', ['may-a.jpg', 'may-b.jpg']));
    await saveVisit(db, book.id, visit(shrine.id, '2025-04-01', ['apr.jpg']));
    await db.execAsync(`
      UPDATE goshuin SET position = 0 WHERE image_file IN ('may-a.jpg', 'apr.jpg');
      UPDATE goshuin SET position = 1 WHERE image_file = 'may-b.jpg';
      PRAGMA user_version = 1;
    `);

    await migrateDbIfNeeded(db);

    expect(await fileOrder(book.id)).toEqual(['apr.jpg', 'may-a.jpg', 'may-b.jpg']);
  });
});

describe('神社・お寺', () => {
  it('お寺として登録でき、検索で見つかる', async () => {
    await createShrine(db, { name: '浅草寺', kana: 'せんそうじ', kind: 'temple' });
    await createShrine(db, { name: '明治神宮', kana: 'めいじじんぐう' });

    const [temple] = await searchShrines(db, 'せんそう');
    expect(temple.name).toBe('浅草寺');
    expect(temple.kind).toBe('temple');

    const [shrine] = await searchShrines(db, '明治');
    expect(shrine.kind).toBe('shrine');
  });

  it('検索語の % や _ は文字としてあつかう', async () => {
    await createShrine(db, { name: '100%神社' });
    await createShrine(db, { name: '普通の神社' });
    expect((await searchShrines(db, '%')).map((s) => s.name)).toEqual(['100%神社']);
  });

  it('御朱印に神社かお寺かが付いてくる', async () => {
    const book = await getCurrentBook(db);
    const temple = await createShrine(db, { name: '浅草寺', kind: 'temple' });
    await saveVisit(db, book.id, visit(temple.id, '2025-04-01', ['t.jpg']));
    const [entry] = await listBookEntries(db, book.id);
    expect(entry.shrineKind).toBe('temple');
  });
});

describe('参拝の保存と並び順', () => {
  it('図鑑用に参拝・場所・御朱印の数を集計する', async () => {
    const book = await getCurrentBook(db);
    const first = await createShrine(db, { name: '一の宮' });
    const second = await createShrine(db, { name: '二の宮' });
    await saveVisit(db, book.id, visit(first.id, '2025-05-01', ['a.jpg', 'b.jpg']));
    await saveVisit(db, book.id, visit(second.id, '2025-05-02', ['c.jpg']));

    expect(await getJourneyStats(db)).toEqual({ visitCount: 2, shrineCount: 2, goshuinCount: 3 });
  });

  it('新しい御朱印は、参拝日にかかわらず帳の最後に綴じる', async () => {
    const book = await getCurrentBook(db);
    const shrine = await createShrine(db, { name: '一の宮' });
    await saveVisit(db, book.id, visit(shrine.id, '2025-05-01', ['a.jpg', 'b.jpg']));
    await saveVisit(db, book.id, visit(shrine.id, '2025-04-01', ['c.jpg']));
    expect(await fileOrder(book.id)).toEqual(['a.jpg', 'b.jpg', 'c.jpg']);
  });

  it('並べ替えた順に表示される', async () => {
    const book = await getCurrentBook(db);
    const shrine = await createShrine(db, { name: '一の宮' });
    await saveVisit(db, book.id, visit(shrine.id, '2025-05-01', ['a.jpg', 'b.jpg', 'c.jpg']));
    const ids = (await listBookEntries(db, book.id)).map((e) => e.id);

    await reorderBook(db, book.id, [ids[2], ids[0], ids[1]]);

    expect(await fileOrder(book.id)).toEqual(['c.jpg', 'a.jpg', 'b.jpg']);
  });

  it('並べ替えたあとに保存した御朱印も最後に入る', async () => {
    const book = await getCurrentBook(db);
    const shrine = await createShrine(db, { name: '一の宮' });
    await saveVisit(db, book.id, visit(shrine.id, '2025-05-01', ['a.jpg', 'b.jpg']));
    const ids = (await listBookEntries(db, book.id)).map((e) => e.id);
    await reorderBook(db, book.id, [ids[1], ids[0]]);
    await saveVisit(db, book.id, visit(shrine.id, '2025-06-01', ['c.jpg']));
    expect(await fileOrder(book.id)).toEqual(['b.jpg', 'a.jpg', 'c.jpg']);
  });
});

describe('御朱印帳', () => {
  it('次の帳を始めると、前の帳は閉じて新しい帳が記録中になる', async () => {
    const first = await getCurrentBook(db);
    const second = await startNewBook(db, '弐の帳', '2025-06-01');

    const current = await getCurrentBook(db);
    expect(current.id).toBe(second.id);

    const books = await listBooks(db);
    expect(books.map((b) => b.name)).toEqual(['弐の帳', '壱の帳']);
    expect(books.find((b) => b.id === first.id)?.endedOn).toBe('2025-06-01');
    expect(books.find((b) => b.id === second.id)?.endedOn).toBeNull();
  });

  it('帳ごとに枚数と参拝の期間を数え、御朱印は別々に並ぶ', async () => {
    const first = await getCurrentBook(db);
    const shrine = await createShrine(db, { name: '一の宮' });
    await saveVisit(db, first.id, visit(shrine.id, '2025-04-01', ['a.jpg']));
    await saveVisit(db, first.id, visit(shrine.id, '2025-05-01', ['b.jpg']));
    const second = await startNewBook(db, '弐の帳', '2025-06-01');
    await saveVisit(db, second.id, visit(shrine.id, '2025-06-02', ['c.jpg']));

    const stats = Object.fromEntries((await listBooks(db)).map((b) => [b.name, b]));
    expect(stats['壱の帳']).toMatchObject({ goshuinCount: 2, firstVisitedOn: '2025-04-01', lastVisitedOn: '2025-05-01' });
    expect(stats['弐の帳']).toMatchObject({ goshuinCount: 1, firstVisitedOn: '2025-06-02' });
    expect(await fileOrder(first.id)).toEqual(['a.jpg', 'b.jpg']);
    expect(await fileOrder(second.id)).toEqual(['c.jpg']);
  });

  it('名前を変えられる（前後の空白は取る）', async () => {
    const book = await getCurrentBook(db);
    await renameBook(db, book.id, '  旅の帳 ');
    expect((await getCurrentBook(db)).name).toBe('旅の帳');
  });
});

describe('編集と削除', () => {
  it('参拝の内容と御朱印の種類・初穂料を書き換える', async () => {
    const book = await getCurrentBook(db);
    const shrine = await createShrine(db, { name: '一の宮' });
    await saveVisit(db, book.id, visit(shrine.id, '2025-04-01', ['a.jpg', 'b.jpg']));
    const [a, b] = await listBookEntries(db, book.id);

    await updateEntry(db, a.id, {
      visitedOn: '2025-04-02',
      weather: '晴れ',
      companions: '家族と',
      omikuji: '大吉',
      memo: '桜が満開',
      kind: 'limited',
      fee: 1000,
    });

    expect(await getEntry(db, a.id)).toMatchObject({
      visitedOn: '2025-04-02',
      weather: '晴れ',
      memo: '桜が満開',
      kind: 'limited',
      fee: 1000,
    });
    // 参拝の内容は同じ参拝の御朱印にも反映され、種類と初穂料はそのまま
    expect(await getEntry(db, b.id)).toMatchObject({ visitedOn: '2025-04-02', omikuji: '大吉', kind: 'regular', fee: 500 });
  });

  it('最後の1枚を消すと、参拝の記録も消える', async () => {
    const book = await getCurrentBook(db);
    const shrine = await createShrine(db, { name: '一の宮' });
    await saveVisit(db, book.id, visit(shrine.id, '2025-04-01', ['a.jpg', 'b.jpg']));
    const [a, b] = await listBookEntries(db, book.id);

    expect(await deleteGoshuin(db, a.id)).toBe('a.jpg');
    expect((await searchShrines(db, ''))[0].visitCount).toBe(1);

    expect(await deleteGoshuin(db, b.id)).toBe('b.jpg');
    expect((await searchShrines(db, ''))[0].visitCount).toBe(0);
    expect(await deleteGoshuin(db, b.id)).toBeNull();
  });
});

describe('地図', () => {
  it('位置のある神社・お寺だけを、最新の御朱印つきで返す', async () => {
    const book = await getCurrentBook(db);
    const withPlace = await createShrine(db, { name: '一の宮', latitude: 35.1, longitude: 139.1 });
    const later = await createShrine(db, { name: '浅草寺', kind: 'temple' });
    await createShrine(db, { name: '位置なし神社' });
    await saveVisit(db, book.id, visit(withPlace.id, '2025-04-01', ['old.jpg']));
    await saveVisit(db, book.id, visit(withPlace.id, '2025-05-01', ['new.jpg']));

    expect(await listMappedPlaces(db)).toHaveLength(1);

    await setShrineLocation(db, later.id, { latitude: 35.7, longitude: 139.8 });
    const places = await listMappedPlaces(db);
    expect(places.map((p) => p.name)).toEqual(['一の宮', '浅草寺']);

    const [first, second] = places;
    expect(first).toMatchObject({ latitude: 35.1, longitude: 139.1, visitCount: 2, lastVisitedOn: '2025-05-01' });
    expect((await getEntry(db, first.latestGoshuinId!))?.imageFile).toBe('new.jpg');
    expect(second).toMatchObject({ kind: 'temple', visitCount: 0, latestGoshuinId: null });
  });
});
