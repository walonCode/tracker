import type { Migration } from "./migration";

// Small local key-value store for app-level flags that don't fit the
// domain/tracker/entry model — currently just onboarding completion.
export const SCHEMA_SQL = `
CREATE TABLE app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export const migration003AppMeta: Migration = {
  version: 3,
  up: async (db) => {
    await db.execAsync(SCHEMA_SQL);
  },
};
