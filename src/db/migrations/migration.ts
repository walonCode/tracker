import type { SQLiteDatabase } from "expo-sqlite";

/**
 * One schema migration. `version` corresponds to the `PRAGMA user_version`
 * the database will be at once `up` has run successfully.
 */
export interface Migration {
  version: number;
  up: (db: SQLiteDatabase) => Promise<void>;
}
