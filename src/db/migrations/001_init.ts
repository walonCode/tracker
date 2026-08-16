import type { Migration } from "./migration";

// Verbatim schema from the Phase 1 data-layer brief. Do not reformat the
// column comments away — they document intent (e.g. domains.key's allowed
// values) that isn't otherwise captured in SQL.
export const SCHEMA_SQL = `
CREATE TABLE domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,             -- 'daily' | 'religion' | 'finance' | 'projects' | 'others'
  label TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE trackers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id INTEGER NOT NULL REFERENCES domains(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily','occasional')),
  kind TEXT NOT NULL DEFAULT 'standard' CHECK (kind IN ('standard','prayer','project_time')),
  color TEXT,
  icon TEXT,
  archived_at TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE tracker_fields (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tracker_id INTEGER NOT NULL REFERENCES trackers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                   -- stable key, e.g. 'fajr_fard'
  label TEXT NOT NULL,                  -- 'Fajr (Fard)'
  type TEXT NOT NULL CHECK (type IN ('number','duration','text','boolean','scale')),
  unit TEXT,
  config TEXT,                          -- JSON, e.g. {"min":1,"max":5} for scale
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tracker_id INTEGER NOT NULL REFERENCES trackers(id) ON DELETE CASCADE,
  occurred_at TEXT NOT NULL,            -- ISO-8601 instant
  local_date TEXT NOT NULL,             -- 'YYYY-MM-DD' device-local, derived at write time
  note TEXT,
  routine_log_id INTEGER REFERENCES routine_logs(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_entries_tracker_date ON entries(tracker_id, local_date);
CREATE INDEX idx_entries_date ON entries(local_date);

CREATE TABLE entry_values (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  field_id INTEGER NOT NULL REFERENCES tracker_fields(id) ON DELETE CASCADE,
  value_number REAL,
  value_text TEXT,
  value_boolean INTEGER                 -- 0/1
);
CREATE INDEX idx_entry_values_entry ON entry_values(entry_id);
CREATE INDEX idx_entry_values_field ON entry_values(field_id);

CREATE TABLE routines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT, color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE routine_trackers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  tracker_id INTEGER NOT NULL REFERENCES trackers(id) ON DELETE CASCADE,
  target_value REAL, target_unit TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE routine_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  completed_at TEXT, note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tracker_id INTEGER NOT NULL REFERENCES trackers(id) ON DELETE CASCADE,
  field_id INTEGER REFERENCES tracker_fields(id) ON DELETE CASCADE,
  target_value REAL NOT NULL, target_unit TEXT,
  target_date TEXT, achieved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tracker_id INTEGER NOT NULL REFERENCES trackers(id) ON DELETE RESTRICT,  -- the auto-created kind='project_time' tracker
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active','paused','done','archived')) DEFAULT 'active',
  description TEXT, color TEXT, icon TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE project_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE project_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL REFERENCES project_pages(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('text','heading','checklist_item','divider','time_log')),
  content TEXT,
  checked INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export const migration001Init: Migration = {
  version: 1,
  up: async (db) => {
    await db.execAsync(SCHEMA_SQL);
  },
};
