import type { SQLiteDatabase } from "expo-sqlite";

/** Reads a single `app_meta` value, or `null` if the key has never been set. */
export async function getAppMeta(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = ?",
    [key]
  );
  return row?.value ?? null;
}

/** Upserts a single `app_meta` value. */
export async function setAppMeta(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    "INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value]
  );
}
