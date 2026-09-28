/// <reference types="jest" />

import type { SQLiteDatabase } from 'expo-sqlite';

import { migrateDbIfNeeded } from '../migrate';
import {
  createShrine,
  deleteGoshuin,
  deleteShrine,
  deleteVisit,
  getCurrentBook,
  getEntry,
  getAvatarPreferences,
  getJourneyStats,
  getReminderPreferences,
  getShrine,
  getShrineCatalogEntry,
  getVisit,
  isSoundEnabled,
  listBookEntries,
  listBooks,
  listShrineVisits,
  listVisitEntries,
  listVisitedShrines,
  renameBook,
  reorderBook,
  saveVisit,
  searchShrines,
  saveAvatarPreferences,
  saveReminderPreferences,
  setShrineFavorite,
  setShrineLocation,
  setSoundEnabled,
  startNewBook,
  updateEntry,
  updateShrine,
  updateVisit,
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

  it('効果音は初めは鳴らし、OFFにすると保存される', async () => {
    expect(await isSoundEnabled(db)).toBe(true);
    await setSoundEnabled(db, false);
    expect(await isSoundEnabled(db)).toBe(false);
    await setSoundEnabled(db, true);
    expect(await isSoundEnabled(db)).toBe(true);
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
  it('参拝済み神社を図鑑用の最新記録付きで返す', async () => {
    const book = await getCurrentBook(db);
    const shrine = await createShrine(db, { name: '明治神宮', prefecture: '東京都' });
    await saveVisit(db, book.id, { ...visit(shrine.id, '2025-04-01', ['old.jpg']), memo: '最初の参拝' });
    await saveVisit(db, book.id, { ...visit(shrine.id, '2025-05-01', ['new.jpg']), memo: '新緑がきれい' });

    expect(await listVisitedShrines(db)).toEqual([
      expect.objectContaining({ name: '明治神宮', visitCount: 2, lastVisitedOn: '2025-05-01', latestImageFile: 'new.jpg', latestMemo: '新緑がきれい' }),
    ]);
  });

  it('お寺として登録でき、検索で見つかる', async () => {
    await createShrine(db, { name: '浅草寺', kana: 'せんそうじ', kind: 'temple' });
    await createShrine(db, { name: '明治神宮', kana: 'めいじじんぐう' });

    const [temple] = await searchShrines(db, 'せんそう');
    expect(temple.name).toBe('浅草寺');
    expect(temple.kind).toBe('temple');

    const [shrine] = await searchShrines(db, '明治');
    expect(shrine.kind).toBe('shrine');
  });

  it('お気に入りにでき、検索ではお気に入りが先に並ぶ', async () => {
    const book = await getCurrentBook(db);
    const meiji = await createShrine(db, { name: '明治神宮' });
    const kanda = await createShrine(db, { name: '神田明神' });
    await saveVisit(db, book.id, visit(meiji.id, '2025-05-01', ['m.jpg']));
    await saveVisit(db, book.id, visit(kanda.id, '2025-04-01', ['k.jpg']));
    expect((await getShrine(db, kanda.id))?.favoritedAt).toBeNull();

    await setShrineFavorite(db, kanda.id, true);
    expect((await getShrine(db, kanda.id))?.favoritedAt).toEqual(expect.any(String));
    expect((await searchShrines(db, '')).map((s) => s.name)).toEqual(['神田明神', '明治神宮']);
    expect((await getShrineCatalogEntry(db, kanda.id))?.favoritedAt).toEqual(expect.any(String));

    await setShrineFavorite(db, kanda.id, false);
    expect((await getShrine(db, kanda.id))?.favoritedAt).toBeNull();
    expect((await searchShrines(db, '')).map((s) => s.name)).toEqual(['明治神宮', '神田明神']);
  });

  it('検索ではよく参拝する神社が先に並ぶ', async () => {
    const book = await getCurrentBook(db);
    const meiji = await createShrine(db, { name: '明治神宮' });
    const kanda = await createShrine(db, { name: '神田明神' });
    await saveVisit(db, book.id, visit(meiji.id, '2025-05-01', ['m.jpg']));
    await saveVisit(db, book.id, visit(kanda.id, '2025-03-01', ['k1.jpg']));
    await saveVisit(db, book.id, visit(kanda.id, '2025-04-01', ['k2.jpg']));
    expect((await searchShrines(db, '')).map((s) => s.name)).toEqual(['神田明神', '明治神宮']);
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
  it('御朱印がなくても参拝を保存して一覧に表示できる', async () => {
    const book = await getCurrentBook(db);
    const shrine = await createShrine(db, { name: '日々神社' });
    await saveVisit(db, book.id, { ...visit(shrine.id, '2025-07-01', []), memo: '朝のお参り' });

    expect(await listBookEntries(db, book.id)).toHaveLength(0);
    expect(await listVisitEntries(db)).toEqual([
      expect.objectContaining({ shrineName: '日々神社', goshuinCount: 0, latestGoshuinId: null, memo: '朝のお参り' }),
    ]);
    expect(await getJourneyStats(db)).toEqual({ visitCount: 1, shrineCount: 1, goshuinCount: 0 });
  });

  it('参拝写真を御朱印とは分けて保存し、一覧の表紙に使える', async () => {
    const book = await getCurrentBook(db);
    const shrine = await createShrine(db, { name: '写真神社' });
    await saveVisit(db, book.id, {
      ...visit(shrine.id, '2025-07-02', []),
      photos: [{ imageFile: 'torii.jpg' }, { imageFile: 'garden.jpg' }],
    });

    expect(await listVisitEntries(db)).toEqual([
      expect.objectContaining({
        shrineName: '写真神社',
        goshuinCount: 0,
        photoCount: 2,
        latestPhotoFile: 'garden.jpg',
        latestImageFile: 'garden.jpg',
      }),
    ]);
    expect(await listBookEntries(db, book.id)).toHaveLength(0);
  });

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

describe('神社・お寺の位置', () => {
  it('あとから位置を登録できる', async () => {
    const shrine = await createShrine(db, { name: '浅草寺', kind: 'temple' });
    expect((await searchShrines(db, '浅草寺'))[0]).toMatchObject({ latitude: null, longitude: null });

    await setShrineLocation(db, shrine.id, { latitude: 35.7, longitude: 139.8 });
    expect((await searchShrines(db, '浅草寺'))[0]).toMatchObject({ latitude: 35.7, longitude: 139.8 });
  });
});

describe('参拝の詳細・編集・削除', () => {
  it('御朱印のない参拝も開けて、書き換え・削除できる', async () => {
    const book = await getCurrentBook(db);
    const shrine = await createShrine(db, { name: '明治神宮' });
    const visitId = await saveVisit(db, book.id, { ...visit(shrine.id, '2025-04-01', []), photos: [{ imageFile: 'p.jpg' }] });

    expect(await getVisit(db, visitId)).toMatchObject({ shrineName: '明治神宮', goshuin: [], photos: [{ imageFile: 'p.jpg' }] });

    await updateVisit(db, visitId, { visitedOn: '2025-04-02', weather: '晴れ', companions: null, omikuji: '大吉', memo: 'よい日' });
    expect(await getVisit(db, visitId)).toMatchObject({ visitedOn: '2025-04-02', weather: '晴れ', omikuji: '大吉', memo: 'よい日' });

    expect(await deleteVisit(db, visitId)).toEqual(['p.jpg']);
    expect(await getVisit(db, visitId)).toBeNull();
    expect(await listVisitEntries(db)).toHaveLength(0);
  });

  it('参拝を消すと、その御朱印も消える', async () => {
    const book = await getCurrentBook(db);
    const shrine = await createShrine(db, { name: '一の宮' });
    const visitId = await saveVisit(db, book.id, visit(shrine.id, '2025-04-01', ['a.jpg', 'b.jpg']));

    expect((await deleteVisit(db, visitId)).sort()).toEqual(['a.jpg', 'b.jpg']);
    expect(await listBookEntries(db, book.id)).toHaveLength(0);
  });
});

describe('神社・お寺の編集・削除', () => {
  it('名前・読み・都道府県・種類を書き換えられる', async () => {
    const shrine = await createShrine(db, { name: 'isezinnguu' });
    expect(await getShrine(db, shrine.id)).toMatchObject({ lineage: null });
    await updateShrine(db, shrine.id, { name: ' 伊勢神宮 ', kana: 'いせじんぐう', prefecture: '', kind: 'shrine', lineage: 'shinmei' });
    expect(await getShrine(db, shrine.id)).toMatchObject({ name: '伊勢神宮', kana: 'いせじんぐう', prefecture: null, lineage: 'shinmei', visitCount: 0 });
  });

  it('神社を消すと、そこでの参拝・御朱印・写真も消え、ほかの神社は残る', async () => {
    const book = await getCurrentBook(db);
    const target = await createShrine(db, { name: '消す神社' });
    const other = await createShrine(db, { name: '残す神社' });
    await saveVisit(db, book.id, { ...visit(target.id, '2025-04-01', ['a.jpg']), photos: [{ imageFile: 'p.jpg' }] });
    await saveVisit(db, book.id, visit(target.id, '2025-04-02', []));
    await saveVisit(db, book.id, visit(other.id, '2025-04-03', ['c.jpg']));

    expect((await deleteShrine(db, target.id)).sort()).toEqual(['a.jpg', 'p.jpg']);
    expect(await getShrine(db, target.id)).toBeNull();
    expect((await listVisitEntries(db)).map((v) => v.shrineName)).toEqual(['残す神社']);
    expect(await fileOrder(book.id)).toEqual(['c.jpg']);
  });
});

describe('神社ごとの記録', () => {
  it('その神社の参拝だけを新しい順に返し、画像は御朱印がなければ写真を使う', async () => {
    const book = await getCurrentBook(db);
    const target = await createShrine(db, { name: '写真の神社' });
    const other = await createShrine(db, { name: 'ほかの神社' });
    await saveVisit(db, book.id, visit(target.id, '2025-04-01', []));
    await saveVisit(db, book.id, { ...visit(target.id, '2025-04-05', []), photos: [{ imageFile: 'p.jpg' }] });
    await saveVisit(db, book.id, visit(other.id, '2025-04-03', ['g.jpg']));

    expect((await listShrineVisits(db, target.id)).map((v) => v.visitedOn)).toEqual(['2025-04-05', '2025-04-01']);
    expect(await getShrineCatalogEntry(db, target.id)).toMatchObject({ visitCount: 2, latestImageFile: 'p.jpg' });
    expect(await getShrineCatalogEntry(db, other.id)).toMatchObject({ latestImageFile: 'g.jpg' });
  });
});
