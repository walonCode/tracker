import type { SQLiteDatabase } from "expo-sqlite";

import type { Domain, DomainKey } from "@/types";

interface DomainRow {
  id: number;
  key: string;
  label: string;
  color: string;
  icon: string | null;
  sort_order: number;
  is_system: number;
  created_at: string;
}

function mapDomain(row: DomainRow): Domain {
  return {
    id: row.id,
    key: row.key as DomainKey,
    label: row.label,
    color: row.color,
    icon: row.icon,
    sortOrder: row.sort_order,
    isSystem: row.is_system === 1,
    createdAt: row.created_at,
  };
}

/**
 * Domains are fixed and seeded once (see db/seed.ts) — there is no
 * domain-creation path. This is the read surface later phases need.
 */
export async function listDomains(db: SQLiteDatabase): Promise<Domain[]> {
  const rows = await db.getAllAsync<DomainRow>(
    "SELECT * FROM domains ORDER BY sort_order ASC, id ASC"
  );
  return rows.map(mapDomain);
}

export async function getDomainByKey(
  db: SQLiteDatabase,
  key: DomainKey
): Promise<Domain | null> {
  const row = await db.getFirstAsync<DomainRow>(
    "SELECT * FROM domains WHERE key = ?",
    key
  );
  return row ? mapDomain(row) : null;
}

export async function getDomainById(
  db: SQLiteDatabase,
  id: number
): Promise<Domain | null> {
  const row = await db.getFirstAsync<DomainRow>(
    "SELECT * FROM domains WHERE id = ?",
    id
  );
  return row ? mapDomain(row) : null;
}
