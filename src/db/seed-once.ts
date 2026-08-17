import type { SQLiteDatabase } from "expo-sqlite";

import { seedDatabase } from "./seed";

/**
 * Data-layer seed guard, called from every entry point that reads the
 * database: the root layout (`src/app/_layout.tsx`, the foreground app
 * path), Today's hooks, the prayer-log screen, and the two headless
 * widget entry points (`src/widgets/widget-task-handler.tsx`,
 * `src/screens/widget-config/index.tsx`) — a widget can be placed or
 * configured before the app is ever opened, so seeding can't be left to a
 * single screen's mount effect.
 *
 * `seedDatabase()` itself is idempotent (each seeder checks-before-insert),
 * so calling it multiple times across app restarts/dev-reloads is always
 * safe; this module-level promise just avoids kicking off redundant
 * parallel seed passes when several call sites race on first render/launch.
 */
let seedPromise: Promise<void> | null = null;

export function ensureSeeded(db: SQLiteDatabase): Promise<void> {
  if (!seedPromise) {
    seedPromise = seedDatabase(db);
  }
  return seedPromise;
}
