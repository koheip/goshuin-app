/// <reference types="jest" />
/// <reference types="node" />

import type { SQLiteDatabase } from 'expo-sqlite';
import { DatabaseSync } from 'node:sqlite';

type Param = string | number | null;

// expo-sqlite の SQLiteDatabase のうち、アプリが使うメソッドだけを Node 組み込みの SQLite で再現する
class TestDatabase {
  private db = new DatabaseSync(':memory:');

  private params(args: unknown[]): Param[] {
    const list = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    return list as Param[];
  }

  async execAsync(sql: string) {
    this.db.exec(sql);
  }

  async getFirstAsync<T>(sql: string, ...args: unknown[]): Promise<T | null> {
    const row = this.db.prepare(sql).get(...this.params(args));
    return row ? ({ ...row } as T) : null;
  }

  async getAllAsync<T>(sql: string, ...args: unknown[]): Promise<T[]> {
    return this.db.prepare(sql).all(...this.params(args)).map((row: object) => ({ ...row }) as T);
  }

  async runAsync(sql: string, ...args: unknown[]) {
    const result = this.db.prepare(sql).run(...this.params(args));
    return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
  }

  async withTransactionAsync(task: () => Promise<void>) {
    this.db.exec('BEGIN');
    try {
      await task();
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
}

export function createTestDb(): SQLiteDatabase {
  return new TestDatabase() as unknown as SQLiteDatabase;
}
