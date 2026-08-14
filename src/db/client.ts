import * as SQLite from "expo-sqlite";
import type { SQLiteDatabase } from "expo-sqlite";

import { migrations } from "./migrations";

const DATABASE_NAME = "tracker.db";

let dbPromise: Promise<SQLiteDatabase> | null = null;

/**
 * Returns the shared app database handle. Opens the connection and applies
 * any pending migrations on first call; subsequent calls reuse the same
 * promise so concurrent callers (e.g. multiple hooks mounting at once)
 * never race each other into opening/migrating twice.
 */
export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate();
  }
  return dbPromise;
}

async function openAndMigrate(): Promise<SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  // Foreign key enforcement is a per-connection PRAGMA (not persisted in the
  // db file), so it must be set every time we open a connection, not just
  // during migrations. Several tables rely on ON DELETE CASCADE/SET NULL.
  await db.execAsync("PRAGMA foreign_keys = ON;");
  await runMigrations(db);
  return db;
}

/**
 * Applies any migrations whose version is greater than the database's
 * current `PRAGMA user_version`, in ascending order, advancing
 * `user_version` after each one. Safe to call repeatedly — a no-op once
 * the database is already at the latest version.
 */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version"
  );
  let currentVersion = row?.user_version ?? 0;

  for (const migration of migrations) {
    if (migration.version <= currentVersion) continue;
    await migration.up(db);
    // PRAGMA doesn't support bound parameters; the version is our own
    // integer literal, never user input.
    await db.execAsync(`PRAGMA user_version = ${migration.version};`);
    currentVersion = migration.version;
  }
}

/**
 * Closes and forgets the cached connection. Not needed in normal app
 * operation (the connection lives for the process lifetime); exists for
 * tests/debug tooling that need a fresh handle.
 */
export async function resetDbConnection(): Promise<void> {
  if (!dbPromise) return;
  const db = await dbPromise;
  dbPromise = null;
  await db.closeAsync();
}
