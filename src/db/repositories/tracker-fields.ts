import type { SQLiteBindValue, SQLiteDatabase } from "expo-sqlite";

import type { FieldType, TrackerField, TrackerFieldConfig } from "@/types";

interface TrackerFieldRow {
  id: number;
  tracker_id: number;
  name: string;
  label: string;
  type: string;
  unit: string | null;
  config: string | null;
  sort_order: number;
  created_at: string;
}

function mapTrackerField(row: TrackerFieldRow): TrackerField {
  return {
    id: row.id,
    trackerId: row.tracker_id,
    name: row.name,
    label: row.label,
    type: row.type as FieldType,
    unit: row.unit,
    config: row.config ? (JSON.parse(row.config) as TrackerFieldConfig) : null,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export interface CreateTrackerFieldInput {
  trackerId: number;
  name: string;
  label: string;
  type: FieldType;
  unit?: string | null;
  config?: TrackerFieldConfig | null;
  sortOrder?: number;
}

export async function createTrackerField(
  db: SQLiteDatabase,
  input: CreateTrackerFieldInput
): Promise<TrackerField> {
  const result = await db.runAsync(
    `INSERT INTO tracker_fields (tracker_id, name, label, type, unit, config, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.trackerId,
      input.name,
      input.label,
      input.type,
      input.unit ?? null,
      input.config ? JSON.stringify(input.config) : null,
      input.sortOrder ?? 0,
    ]
  );
  const field = await getTrackerFieldById(db, result.lastInsertRowId);
  if (!field) throw new Error("createTrackerField: failed to load row after insert");
  return field;
}

export async function getTrackerFieldById(
  db: SQLiteDatabase,
  id: number
): Promise<TrackerField | null> {
  const row = await db.getFirstAsync<TrackerFieldRow>(
    "SELECT * FROM tracker_fields WHERE id = ?",
    id
  );
  return row ? mapTrackerField(row) : null;
}

export async function listTrackerFields(
  db: SQLiteDatabase,
  trackerId: number
): Promise<TrackerField[]> {
  const rows = await db.getAllAsync<TrackerFieldRow>(
    "SELECT * FROM tracker_fields WHERE tracker_id = ? ORDER BY sort_order ASC, id ASC",
    trackerId
  );
  return rows.map(mapTrackerField);
}

export interface UpdateTrackerFieldInput {
  label?: string;
  unit?: string | null;
  config?: TrackerFieldConfig | null;
  sortOrder?: number;
}

export async function updateTrackerField(
  db: SQLiteDatabase,
  id: number,
  input: UpdateTrackerFieldInput
): Promise<TrackerField | null> {
  const sets: string[] = [];
  const params: SQLiteBindValue[] = [];

  if (input.label !== undefined) {
    sets.push("label = ?");
    params.push(input.label);
  }
  if (input.unit !== undefined) {
    sets.push("unit = ?");
    params.push(input.unit);
  }
  if (input.config !== undefined) {
    sets.push("config = ?");
    params.push(input.config ? JSON.stringify(input.config) : null);
  }
  if (input.sortOrder !== undefined) {
    sets.push("sort_order = ?");
    params.push(input.sortOrder);
  }

  if (sets.length === 0) return getTrackerFieldById(db, id);

  params.push(id);
  await db.runAsync(
    `UPDATE tracker_fields SET ${sets.join(", ")} WHERE id = ?`,
    params
  );
  return getTrackerFieldById(db, id);
}

/** Hard delete. Cascades to entry_values referencing this field. */
export async function deleteTrackerField(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync("DELETE FROM tracker_fields WHERE id = ?", id);
}
