import { migration001Init } from "./001_init";
import { migration002Widgets } from "./002_widgets";
import type { Migration } from "./migration";

export type { Migration } from "./migration";

// Ordered list of all migrations. To add a new one:
// 1. Create `NNN_name.ts` exporting a `Migration` with the next `version`.
// 2. Import it here and append it to this array.
export const migrations: Migration[] = [migration001Init, migration002Widgets];
