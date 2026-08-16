import type { Migration } from "./migration";

// Verbatim schema from the Phase 9 (task-10) brief.
export const SCHEMA_SQL = `
CREATE TABLE widget_instances (
  widget_id INTEGER PRIMARY KEY,      -- Android's native appWidgetId
  content_type TEXT NOT NULL,         -- 'contribution_graph' | 'project_time' | ...
  options TEXT,                       -- JSON: { trackerId?, projectId?, rangeDays? }
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export const migration002Widgets: Migration = {
  version: 2,
  up: async (db) => {
    await db.execAsync(SCHEMA_SQL);
  },
};
