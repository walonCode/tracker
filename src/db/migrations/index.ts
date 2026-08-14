import { migration001Init } from "./001_init";
import type { Migration } from "./migration";

export type { Migration } from "./migration";

// Ordered list of all migrations. To add a new one (e.g. 002_widgets):
// 1. Create `002_widgets.ts` exporting a `Migration` with `version: 2`.
// 2. Import it here and append it to this array.
export const migrations: Migration[] = [migration001Init];
