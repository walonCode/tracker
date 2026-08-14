import type { SQLiteBindValue, SQLiteDatabase } from "expo-sqlite";

import type { Tracker, TrackerFrequency, TrackerKind } from "@/types";

interface TrackerRow {
  id: number;
  domain_id: number;
  name: string;
  frequency: string;
  kind: string;
  color: string | null;
  icon: string | null;
  archived_at: string | null;
  sort_order: number;
  created_at: string;
}

function mapTracker(row: TrackerRow): Tracker {
  return {
    id: row.id,
    domainId: row.domain_id,
    name: row.name,
    frequency: row.frequency as TrackerFrequency,
    kind: row.kind as TrackerKind,
    color: row.color,
    icon: row.icon,
    archivedAt: row.archived_at,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export interface CreateTrackerInput {
  domainId: number;
  name: string;
  frequency: TrackerFrequency;
  kind?: TrackerKind;
  color?: string | null;
  icon?: string | null;
  sortOrder?: number;
}

export async function createTracker(
  db: SQLiteDatabase,
  input: CreateTrackerInput
): Promise<Tracker> {
  const result = await db.runAsync(
    `INSERT INTO trackers (domain_id, name, frequency, kind, color, icon, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.domainId,
      input.name,
      input.frequency,
      input.kind ?? "standard",
      input.color ?? null,
      input.icon ?? null,
      input.sortOrder ?? 0,
    ]
  );
  const tracker = await getTrackerById(db, result.lastInsertRowId);
  if (!tracker) throw new Error("createTracker: failed to load row after insert");
  return tracker;
}

export async function getTrackerById(
  db: SQLiteDatabase,
  id: number
): Promise<Tracker | null> {
  const row = await db.getFirstAsync<TrackerRow>(
    "SELECT * FROM trackers WHERE id = ?",
    id
  );
  return row ? mapTracker(row) : null;
}

export interface ListTrackersOptions {
  domainId?: number;
  /** Defaults to false — archived trackers are excluded unless requested. */
  includeArchived?: boolean;
}

export async function listTrackers(
  db: SQLiteDatabase,
  options: ListTrackersOptions = {}
): Promise<Tracker[]> {
  const conditions: string[] = [];
  const params: SQLiteBindValue[] = [];

  if (options.domainId !== undefined) {
    conditions.push("domain_id = ?");
    params.push(options.domainId);
  }
  if (!options.includeArchived) {
    conditions.push("archived_at IS NULL");
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = await db.getAllAsync<TrackerRow>(
    `SELECT * FROM trackers ${where} ORDER BY sort_order ASC, id ASC`,
    params
  );
  return rows.map(mapTracker);
}

export async function listTrackersByKind(
  db: SQLiteDatabase,
  kind: TrackerKind
): Promise<Tracker[]> {
  const rows = await db.getAllAsync<TrackerRow>(
    "SELECT * FROM trackers WHERE kind = ? ORDER BY id ASC",
    kind
  );
  return rows.map(mapTracker);
}

export interface UpdateTrackerInput {
  name?: string;
  frequency?: TrackerFrequency;
  color?: string | null;
  icon?: string | null;
  sortOrder?: number;
}

export async function updateTracker(
  db: SQLiteDatabase,
  id: number,
  input: UpdateTrackerInput
): Promise<Tracker | null> {
  const sets: string[] = [];
  const params: SQLiteBindValue[] = [];

  if (input.name !== undefined) {
    sets.push("name = ?");
    params.push(input.name);
  }
  if (input.frequency !== undefined) {
    sets.push("frequency = ?");
    params.push(input.frequency);
  }
  if (input.color !== undefined) {
    sets.push("color = ?");
    params.push(input.color);
  }
  if (input.icon !== undefined) {
    sets.push("icon = ?");
    params.push(input.icon);
  }
  if (input.sortOrder !== undefined) {
    sets.push("sort_order = ?");
    params.push(input.sortOrder);
  }

  if (sets.length === 0) return getTrackerById(db, id);

  params.push(id);
  await db.runAsync(`UPDATE trackers SET ${sets.join(", ")} WHERE id = ?`, params);
  return getTrackerById(db, id);
}

export async function archiveTracker(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(
    "UPDATE trackers SET archived_at = datetime('now') WHERE id = ?",
    id
  );
}

export async function unarchiveTracker(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync("UPDATE trackers SET archived_at = NULL WHERE id = ?", id);
}

/** Hard delete. Cascades to tracker_fields/entries/entry_values/goals/routine_trackers. */
export async function deleteTracker(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync("DELETE FROM trackers WHERE id = ?", id);
}
