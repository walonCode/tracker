import type { SQLiteBindValue, SQLiteDatabase } from "expo-sqlite";

import type { Goal } from "@/types";

interface GoalRow {
  id: number;
  tracker_id: number;
  field_id: number | null;
  target_value: number;
  target_unit: string | null;
  target_date: string | null;
  achieved_at: string | null;
  created_at: string;
}

function mapGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    trackerId: row.tracker_id,
    fieldId: row.field_id,
    targetValue: row.target_value,
    targetUnit: row.target_unit,
    targetDate: row.target_date,
    achievedAt: row.achieved_at,
    createdAt: row.created_at,
  };
}

export interface CreateGoalInput {
  trackerId: number;
  fieldId?: number | null;
  targetValue: number;
  targetUnit?: string | null;
  targetDate?: string | null;
}

export async function createGoal(db: SQLiteDatabase, input: CreateGoalInput): Promise<Goal> {
  const result = await db.runAsync(
    `INSERT INTO goals (tracker_id, field_id, target_value, target_unit, target_date)
     VALUES (?, ?, ?, ?, ?)`,
    [
      input.trackerId,
      input.fieldId ?? null,
      input.targetValue,
      input.targetUnit ?? null,
      input.targetDate ?? null,
    ]
  );
  const goal = await getGoalById(db, result.lastInsertRowId);
  if (!goal) throw new Error("createGoal: failed to load row after insert");
  return goal;
}

export async function getGoalById(db: SQLiteDatabase, id: number): Promise<Goal | null> {
  const row = await db.getFirstAsync<GoalRow>("SELECT * FROM goals WHERE id = ?", id);
  return row ? mapGoal(row) : null;
}

export async function listGoalsForTracker(
  db: SQLiteDatabase,
  trackerId: number
): Promise<Goal[]> {
  const rows = await db.getAllAsync<GoalRow>(
    "SELECT * FROM goals WHERE tracker_id = ? ORDER BY id DESC",
    trackerId
  );
  return rows.map(mapGoal);
}

export async function listActiveGoals(db: SQLiteDatabase): Promise<Goal[]> {
  const rows = await db.getAllAsync<GoalRow>(
    "SELECT * FROM goals WHERE achieved_at IS NULL ORDER BY target_date ASC, id ASC"
  );
  return rows.map(mapGoal);
}

export interface UpdateGoalInput {
  targetValue?: number;
  targetUnit?: string | null;
  targetDate?: string | null;
}

export async function updateGoal(
  db: SQLiteDatabase,
  id: number,
  input: UpdateGoalInput
): Promise<Goal | null> {
  const sets: string[] = [];
  const params: SQLiteBindValue[] = [];

  if (input.targetValue !== undefined) {
    sets.push("target_value = ?");
    params.push(input.targetValue);
  }
  if (input.targetUnit !== undefined) {
    sets.push("target_unit = ?");
    params.push(input.targetUnit);
  }
  if (input.targetDate !== undefined) {
    sets.push("target_date = ?");
    params.push(input.targetDate);
  }

  if (sets.length === 0) return getGoalById(db, id);

  params.push(id);
  await db.runAsync(`UPDATE goals SET ${sets.join(", ")} WHERE id = ?`, params);
  return getGoalById(db, id);
}

export async function markGoalAchieved(
  db: SQLiteDatabase,
  id: number,
  achievedAt?: string
): Promise<void> {
  await db.runAsync(
    "UPDATE goals SET achieved_at = ? WHERE id = ?",
    [achievedAt ?? new Date().toISOString(), id]
  );
}

export async function markGoalUnachieved(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync("UPDATE goals SET achieved_at = NULL WHERE id = ?", id);
}

export async function deleteGoal(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync("DELETE FROM goals WHERE id = ?", id);
}
