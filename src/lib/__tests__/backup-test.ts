/// <reference types="jest" />

import type { SQLiteDatabase } from 'expo-sqlite';

import { migrateDbIfNeeded } from '@/db/migrate';
import {
  getAvatarPreferences,
  getReminderPreferences,
  isTutorialComplete,
  saveAvatarPreferences,
  saveReminderPreferences,
  setTutorialComplete,
} from '@/db/repo';
import { createTestDb } from '@/testing/testDb';

import { exportBackup, restoreBackup } from '../backup';

jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual('crypto').randomUUID() }));

// expo-file-system の File / Directory のうち、バックアップが使う分だけをメモリ上で再現する
jest.mock('expo-file-system', () => {
  const files = new Map<string, string>();
  const dirs = new Set<string>();
  const join = (parts: unknown[]) =>
    parts.map((p) => (typeof p === 'string' ? p : (p as { uri: string }).uri)).join('/');

  class Directory {
    uri: string;
    constructor(...parts: unknown[]) { this.uri = join(parts); }
    get exists() { return dirs.has(this.uri); }
    create() { dirs.add(this.uri); }
    delete() { dirs.delete(this.uri); }
    list() {
      return [...files.keys()]
        .filter((uri) => uri.startsWith(`${this.uri}/`) && !uri.slice(this.uri.length + 1).includes('/'))
        .map((uri) => new File(uri));
    }
  }

  class File {
    uri: string;
    constructor(...parts: unknown[]) { this.uri = join(parts); }
    get name() { return this.uri.slice(this.uri.lastIndexOf('/') + 1); }
    get exists() { return files.has(this.uri); }
    create() { files.set(this.uri, ''); }
    delete() { files.delete(this.uri); }
    write(content: string) { files.set(this.uri, content); }
    async text() { return files.get(this.uri) ?? ''; }
    async base64() { return files.get(this.uri) ?? ''; }
  }

  return { Directory, File, Paths: { cache: 'cache', document: 'document' } };
});

async function freshDb(): Promise<SQLiteDatabase> {
  const db = createTestDb();
  await migrateDbIfNeeded(db);
  return db;
}

describe('バックアップ', () => {
  test('アバターとチュートリアルの設定も戻る', async () => {
    const source = await freshDb();
    await saveAvatarPreferences(source, { blessing: 'susanoo', equipment: ['magatama', 'sakaki'] });
    await setTutorialComplete(source, true);
    const file = await exportBackup(source);

    const target = await freshDb();
    await restoreBackup(target, file.uri);

    expect(await getAvatarPreferences(target)).toEqual({ blessing: 'susanoo', equipment: ['magatama', 'sakaki'] });
    expect(await isTutorialComplete(target)).toBe(true);
  });

  test('リマインダーは書き出さず、戻しても今の端末の設定が残る', async () => {
    const source = await freshDb();
    await saveReminderPreferences(source, { enabled: true, weekday: 2, hour: 8, minute: 30, notificationId: 'old-device' });
    const file = await exportBackup(source);
    expect(await file.text()).not.toContain('old-device');

    const target = await freshDb();
    const reminder = { enabled: true, weekday: 5, hour: 20, minute: 0, notificationId: 'this-device' };
    await saveReminderPreferences(target, reminder);
    await restoreBackup(target, file.uri);

    expect(await getReminderPreferences(target)).toEqual(reminder);
  });

  test('版3のファイルから戻しても、今の端末のアバターと設定は残る', async () => {
    const source = await freshDb();
    const file = await exportBackup(source);
    const backup = JSON.parse(await file.text());
    backup.version = 3;
    delete backup.tables.avatar_preferences;
    delete backup.tables.app_settings;
    file.write(JSON.stringify(backup));

    const target = await freshDb();
    await saveAvatarPreferences(target, { blessing: 'okuninushi', equipment: ['omamori'] });
    await setTutorialComplete(target, true);
    await restoreBackup(target, file.uri);

    expect(await getAvatarPreferences(target)).toEqual({ blessing: 'okuninushi', equipment: ['omamori'] });
    expect(await isTutorialComplete(target)).toBe(true);
  });
});
