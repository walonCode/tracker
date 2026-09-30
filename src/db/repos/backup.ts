import { nowSeconds } from "@/domain/clock";

import { getUserVersion, migrations } from "../migrations";
import type { BindValue, Db } from "../types";

// Export writes every table to one JSON document; import restores it into
// a database that has no plan items and no sessions yet.

/** Parents before children, so foreign keys hold while inserting. */
export const TABLES = ["goals", "tasks", "repeat_days", "plan_items", "sessions", "allowed_apps", "settings"] as const;
type Table = (typeof TABLES)[number];

export interface ExportFile {
  schemaVersion: number;
  exportedAt: number;
  tables: Record<Table, Record<string, BindValue>[]>;
}

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportError";
  }
}

export async function exportData(db: Db): Promise<ExportFile> {
  const tables = {} as ExportFile["tables"];
  for (const table of TABLES) {
    // Table names come from the fixed list above, never from input.
    tables[table] = await db.getAllAsync<Record<string, BindValue>>(`SELECT * FROM ${table}`, []);
  }
  return { schemaVersion: await getUserVersion(db), exportedAt: nowSeconds(), tables };
}

/** Import is offered only before any planning or sessions exist. */
export async function canImport(db: Db): Promise<boolean> {
  const row = await db.getFirstAsync<{ n: number }>(
    "SELECT (SELECT COUNT(*) FROM plan_items) + (SELECT COUNT(*) FROM sessions) AS n",
    [],
  );
  return (row?.n ?? 0) === 0;
}

async function columnsOf(db: Db, table: Table): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`, []);
  return new Set(rows.map((r) => r.name));
}

function parse(text: string): ExportFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError("This file is not a Focus export. Pick the .json file that Export data created.");
  }
  const file = data as Partial<ExportFile>;
  if (typeof file !== "object" || file === null || typeof file.schemaVersion !== "number" || !file.tables) {
    throw new ImportError("This file is not a Focus export. Pick the .json file that Export data created.");
  }
  if (file.schemaVersion !== migrations.length) {
    throw new ImportError(
      `This export is from database version ${file.schemaVersion}; this app uses version ${migrations.length}. Update the app, then try again.`,
    );
  }
  return file as ExportFile;
}

/**
 * Replaces the (empty) database with an export, inside one transaction:
 * any error rolls everything back. Column names are checked against the
 * schema; every value is bound.
 */
export async function importData(db: Db, text: string): Promise<void> {
  const file = parse(text);
  if (!(await canImport(db))) {
    throw new ImportError("Import works only before any plans or sessions exist.");
  }

  const known = new Map<Table, Set<string>>();
  for (const table of TABLES) known.set(table, await columnsOf(db, table));

  await db.withTransactionAsync(async () => {
    // Children before parents when clearing, parents before children when filling.
    for (const table of [...TABLES].reverse()) await db.execAsync(`DELETE FROM ${table}`);
    for (const table of TABLES) {
      const rows = file.tables[table] ?? [];
      if (!Array.isArray(rows)) throw new ImportError(`The ${table} section is not a list.`);
      for (const row of rows) {
        const columns = Object.keys(row);
        const unknown = columns.find((c) => !known.get(table)!.has(c));
        if (unknown) throw new ImportError(`Unknown column ${unknown} in ${table}.`);
        await db.runAsync(
          `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
          columns.map((c) => row[c]),
        );
      }
    }
  });
}
