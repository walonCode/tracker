import type { SQLiteDatabase } from "expo-sqlite";

import { seedDatabase } from "@/db/seed";

/**
 * Nothing in the app currently calls `seedDatabase()`/`seedCore()` at
 * startup (see `src/db/seed.ts` and `src/app/_layout.tsx`) — Wave 1 left
 * that wiring to whichever later phase first needs guaranteed non-empty
 * data. Rather than editing the shared root layout (two other agents are
 * touching screens concurrently in this checkout — see task-5-brief.md's
 * file-ownership section), the Today screen triggers it here, from its own
 * hooks, guarded to run at most once per process.
 *
 * `seedDatabase()` itself is idempotent (each seeder checks-before-insert),
 * so calling it multiple times across app restarts/dev-reloads is always
 * safe; this module-level promise just avoids kicking off redundant
 * parallel seed passes when `use-daily-checklist`, `use-todays-feed`, and
 * `use-contribution-preview` all mount at once on first render.
 */
let seedPromise: Promise<void> | null = null;

export function ensureSeeded(db: SQLiteDatabase): Promise<void> {
  if (!seedPromise) {
    seedPromise = seedDatabase(db);
  }
  return seedPromise;
}
