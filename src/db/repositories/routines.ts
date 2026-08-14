import type { SQLiteBindValue, SQLiteDatabase } from "expo-sqlite";

import type { Routine, RoutineLog, RoutineTracker } from "@/types";

// ---- routines ----------------------------------------------------------

interface RoutineRow {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
}

function mapRoutine(row: RoutineRow): Routine {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    sortOrder: row.sort_order,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  };
}

export interface CreateRoutineInput {
  name: string;
  icon?: string | null;
  color?: string | null;
  sortOrder?: number;
}

export async function createRoutine(
  db: SQLiteDatabase,
  input: CreateRoutineInput
): Promise<Routine> {
  const result = await db.runAsync(
    "INSERT INTO routines (name, icon, color, sort_order) VALUES (?, ?, ?, ?)",
    [input.name, input.icon ?? null, input.color ?? null, input.sortOrder ?? 0]
  );
  const routine = await getRoutineById(db, result.lastInsertRowId);
  if (!routine) throw new Error("createRoutine: failed to load row after insert");
  return routine;
}

export async function getRoutineById(
  db: SQLiteDatabase,
  id: number
): Promise<Routine | null> {
  const row = await db.getFirstAsync<RoutineRow>(
    "SELECT * FROM routines WHERE id = ?",
    id
  );
  return row ? mapRoutine(row) : null;
}

export async function listRoutines(
  db: SQLiteDatabase,
  options: { includeArchived?: boolean } = {}
): Promise<Routine[]> {
  const where = options.includeArchived ? "" : "WHERE archived_at IS NULL";
  const rows = await db.getAllAsync<RoutineRow>(
    `SELECT * FROM routines ${where} ORDER BY sort_order ASC, id ASC`
  );
  return rows.map(mapRoutine);
}

export interface UpdateRoutineInput {
  name?: string;
  icon?: string | null;
  color?: string | null;
  sortOrder?: number;
}

export async function updateRoutine(
  db: SQLiteDatabase,
  id: number,
  input: UpdateRoutineInput
): Promise<Routine | null> {
  const sets: string[] = [];
  const params: SQLiteBindValue[] = [];

  if (input.name !== undefined) {
    sets.push("name = ?");
    params.push(input.name);
  }
  if (input.icon !== undefined) {
    sets.push("icon = ?");
    params.push(input.icon);
  }
  if (input.color !== undefined) {
    sets.push("color = ?");
    params.push(input.color);
  }
  if (input.sortOrder !== undefined) {
    sets.push("sort_order = ?");
    params.push(input.sortOrder);
  }

  if (sets.length === 0) return getRoutineById(db, id);

  params.push(id);
  await db.runAsync(`UPDATE routines SET ${sets.join(", ")} WHERE id = ?`, params);
  return getRoutineById(db, id);
}

export async function archiveRoutine(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(
    "UPDATE routines SET archived_at = datetime('now') WHERE id = ?",
    id
  );
}

export async function unarchiveRoutine(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync("UPDATE routines SET archived_at = NULL WHERE id = ?", id);
}

/** Hard delete. Cascades to routine_trackers/routine_logs. */
export async function deleteRoutine(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync("DELETE FROM routines WHERE id = ?", id);
}

// ---- routine_trackers ---------------------------------------------------

interface RoutineTrackerRow {
  id: number;
  routine_id: number;
  tracker_id: number;
  target_value: number | null;
  target_unit: string | null;
  sort_order: number;
}

function mapRoutineTracker(row: RoutineTrackerRow): RoutineTracker {
  return {
    id: row.id,
    routineId: row.routine_id,
    trackerId: row.tracker_id,
    targetValue: row.target_value,
    targetUnit: row.target_unit,
    sortOrder: row.sort_order,
  };
}

export interface AddRoutineTrackerInput {
  routineId: number;
  trackerId: number;
  targetValue?: number | null;
  targetUnit?: string | null;
  sortOrder?: number;
}

export async function addRoutineTracker(
  db: SQLiteDatabase,
  input: AddRoutineTrackerInput
): Promise<RoutineTracker> {
  const result = await db.runAsync(
    `INSERT INTO routine_trackers (routine_id, tracker_id, target_value, target_unit, sort_order)
     VALUES (?, ?, ?, ?, ?)`,
    [
      input.routineId,
      input.trackerId,
      input.targetValue ?? null,
      input.targetUnit ?? null,
      input.sortOrder ?? 0,
    ]
  );
  const row = await db.getFirstAsync<RoutineTrackerRow>(
    "SELECT * FROM routine_trackers WHERE id = ?",
    result.lastInsertRowId
  );
  if (!row) throw new Error("addRoutineTracker: failed to load row after insert");
  return mapRoutineTracker(row);
}

export async function listRoutineTrackers(
  db: SQLiteDatabase,
  routineId: number
): Promise<RoutineTracker[]> {
  const rows = await db.getAllAsync<RoutineTrackerRow>(
    "SELECT * FROM routine_trackers WHERE routine_id = ? ORDER BY sort_order ASC, id ASC",
    routineId
  );
  return rows.map(mapRoutineTracker);
}

export async function removeRoutineTracker(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  await db.runAsync("DELETE FROM routine_trackers WHERE id = ?", id);
}

// ---- routine_logs --------------------------------------------------------

interface RoutineLogRow {
  id: number;
  routine_id: number;
  date: string;
  completed_at: string | null;
  note: string | null;
  created_at: string;
}

function mapRoutineLog(row: RoutineLogRow): RoutineLog {
  return {
    id: row.id,
    routineId: row.routine_id,
    date: row.date,
    completedAt: row.completed_at,
    note: row.note,
    createdAt: row.created_at,
  };
}

export interface CreateRoutineLogInput {
  routineId: number;
  date: string;
  completedAt?: string | null;
  note?: string | null;
}

export async function createRoutineLog(
  db: SQLiteDatabase,
  input: CreateRoutineLogInput
): Promise<RoutineLog> {
  const result = await db.runAsync(
    "INSERT INTO routine_logs (routine_id, date, completed_at, note) VALUES (?, ?, ?, ?)",
    [input.routineId, input.date, input.completedAt ?? null, input.note ?? null]
  );
  const row = await db.getFirstAsync<RoutineLogRow>(
    "SELECT * FROM routine_logs WHERE id = ?",
    result.lastInsertRowId
  );
  if (!row) throw new Error("createRoutineLog: failed to load row after insert");
  return mapRoutineLog(row);
}

export async function listRoutineLogs(
  db: SQLiteDatabase,
  routineId: number
): Promise<RoutineLog[]> {
  const rows = await db.getAllAsync<RoutineLogRow>(
    "SELECT * FROM routine_logs WHERE routine_id = ? ORDER BY date DESC, id DESC",
    routineId
  );
  return rows.map(mapRoutineLog);
}

export async function getRoutineLogByDate(
  db: SQLiteDatabase,
  routineId: number,
  date: string
): Promise<RoutineLog | null> {
  const row = await db.getFirstAsync<RoutineLogRow>(
    "SELECT * FROM routine_logs WHERE routine_id = ? AND date = ?",
    [routineId, date]
  );
  return row ? mapRoutineLog(row) : null;
}

export interface UpdateRoutineLogInput {
  completedAt?: string | null;
  note?: string | null;
}

export async function updateRoutineLog(
  db: SQLiteDatabase,
  id: number,
  input: UpdateRoutineLogInput
): Promise<RoutineLog | null> {
  const sets: string[] = [];
  const params: SQLiteBindValue[] = [];

  if (input.completedAt !== undefined) {
    sets.push("completed_at = ?");
    params.push(input.completedAt);
  }
  if (input.note !== undefined) {
    sets.push("note = ?");
    params.push(input.note);
  }

  if (sets.length > 0) {
    params.push(id);
    await db.runAsync(
      `UPDATE routine_logs SET ${sets.join(", ")} WHERE id = ?`,
      params
    );
  }

  const row = await db.getFirstAsync<RoutineLogRow>(
    "SELECT * FROM routine_logs WHERE id = ?",
    id
  );
  return row ? mapRoutineLog(row) : null;
}

export async function deleteRoutineLog(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync("DELETE FROM routine_logs WHERE id = ?", id);
}
