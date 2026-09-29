import type { Db } from "./types";

// Ordered schema migrations. Entry N brings the database to
// `PRAGMA user_version` N + 1. Append new entries; never edit a shipped one.
export const migrations: readonly string[] = [
  // 1: initial schema
  `
  CREATE TABLE goals (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    due_date TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active','completed','dropped')),
    drop_reason TEXT,
    created_at INTEGER NOT NULL,
    closed_at INTEGER
  );
  CREATE UNIQUE INDEX one_active_goal ON goals(status) WHERE status = 'active';

  CREATE TABLE tasks (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    detail TEXT,
    amount INTEGER NOT NULL CHECK (amount > 0),
    unit TEXT NOT NULL CHECK (unit IN ('pages','verses','words','sets','papers','min')),
    cursor INTEGER,
    default_minutes INTEGER NOT NULL CHECK (default_minutes IN (15,30,50,90)),
    goal_id INTEGER REFERENCES goals(id),
    start_time TEXT,
    archived_at INTEGER,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE repeat_days (
    task_id INTEGER NOT NULL REFERENCES tasks(id),
    weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    PRIMARY KEY (task_id, weekday)
  );

  CREATE TABLE plan_items (
    id INTEGER PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id),
    plan_date TEXT NOT NULL,
    position INTEGER NOT NULL,
    label_snapshot TEXT NOT NULL,
    limit_minutes INTEGER NOT NULL,
    target_amount INTEGER NOT NULL,
    done_amount INTEGER NOT NULL DEFAULT 0,
    used_seconds INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'planned'
      CHECK (status IN ('planned','done','skipped','dropped')),
    completed_at INTEGER,
    UNIQUE (task_id, plan_date)
  );
  CREATE INDEX plan_items_date ON plan_items(plan_date);

  CREATE TABLE sessions (
    id INTEGER PRIMARY KEY,
    plan_item_id INTEGER NOT NULL REFERENCES plan_items(id),
    state TEXT NOT NULL CHECK (state IN ('running','paused','ended')),
    is_open INTEGER CHECK (is_open = 1),
    started_at INTEGER NOT NULL,
    resumed_at INTEGER,
    ended_at INTEGER,
    active_seconds INTEGER NOT NULL DEFAULT 0,
    end_reason TEXT CHECK (end_reason IN ('limit','finished','stopped','early_exit')),
    finished TEXT CHECK (finished IN ('yes','partly')),
    amount_done INTEGER,
    cursor_from INTEGER,
    cursor_to INTEGER,
    note TEXT
  );
  CREATE UNIQUE INDEX one_open_session ON sessions(is_open);

  CREATE TABLE allowed_apps (
    package_name TEXT PRIMARY KEY,
    label TEXT NOT NULL
  );

  CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
];

export async function getUserVersion(db: Db): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version", []);
  return row?.user_version ?? 0;
}

/**
 * Applies every migration above the current `user_version`, each in its own
 * transaction together with the version bump, so a failed migration leaves
 * the database at the previous version.
 */
export async function runMigrations(db: Db): Promise<void> {
  const current = await getUserVersion(db);
  for (let version = current + 1; version <= migrations.length; version++) {
    const sql = migrations[version - 1];
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
      // PRAGMA takes no bound parameters; `version` is our own integer.
      await db.execAsync(`PRAGMA user_version = ${version}`);
    });
  }
}
