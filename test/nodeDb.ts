import type { BindValue, Db } from "@/db/types";

// Test-only `Db` backed by Node's built-in SQLite (node:sqlite). Loaded via
// process.getBuiltinModule because jest's resolver does not know the
// prefix-only `node:sqlite` module.

interface StatementSync {
  run(...params: BindValue[]): { lastInsertRowid: number | bigint; changes: number | bigint };
  get(...params: BindValue[]): unknown;
  all(...params: BindValue[]): unknown[];
}

interface DatabaseSync {
  exec(sql: string): void;
  prepare(sql: string): StatementSync;
  close(): void;
}

type SqliteModule = { DatabaseSync: new (path: string) => DatabaseSync };

export interface TestDb extends Db {
  close(): void;
}

export function openTestDb(): TestDb {
  const { DatabaseSync } = (
    process as unknown as { getBuiltinModule(id: string): SqliteModule }
  ).getBuiltinModule("node:sqlite");
  const raw = new DatabaseSync(":memory:");
  let depth = 0;

  return {
    async execAsync(source) {
      raw.exec(source);
    },
    async runAsync(source, params) {
      const result = raw.prepare(source).run(...params);
      return { lastInsertRowId: Number(result.lastInsertRowid), changes: Number(result.changes) };
    },
    async getFirstAsync<T>(source: string, params: BindValue[]) {
      return (raw.prepare(source).get(...params) as T | undefined) ?? null;
    },
    async getAllAsync<T>(source: string, params: BindValue[]) {
      return raw.prepare(source).all(...params) as T[];
    },
    async withTransactionAsync(task) {
      if (depth > 0) throw new Error("Nested transactions are not supported");
      depth++;
      raw.exec("BEGIN");
      try {
        await task();
        raw.exec("COMMIT");
      } catch (error) {
        raw.exec("ROLLBACK");
        throw error;
      } finally {
        depth--;
      }
    },
    close() {
      raw.close();
    },
  };
}
