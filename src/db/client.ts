import type { Db } from "./types";
import { runMigrations } from "./migrations";

export const DATABASE_NAME = "focus.db";

/**
 * Runs once per connection before any screen reads the database.
 * `foreign_keys` is per connection and must be set outside a transaction;
 * `journal_mode` persists in the file but is cheap to reassert.
 */
export async function initDatabase(db: Db): Promise<void> {
  await db.execAsync("PRAGMA foreign_keys = ON");
  await db.execAsync("PRAGMA journal_mode = WAL");
  await runMigrations(db);
}
