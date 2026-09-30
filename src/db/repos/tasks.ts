import { nowSeconds } from "@/domain/clock";
import { usesCursor } from "@/domain/labels";
import type { TaskWithRepeats } from "@/domain/planBuilder";
import {
  validateAmount,
  validateCursor,
  validateRepeatDays,
  validateStartTime,
  validateTaskTitle,
} from "@/domain/taskRules";

import { TASK_UNITS, TIME_LIMITS, type Db, type Task, type TaskUnit, type TimeLimit } from "../types";

export interface TaskInput {
  title: string;
  detail: string | null;
  amount: number;
  unit: TaskUnit;
  cursor: number | null;
  defaultMinutes: TimeLimit;
  goalId: number | null;
  startTime: string | null;
  repeatDays: number[];
}

export class TaskValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskValidationError";
  }
}

function validate(input: TaskInput): void {
  const error =
    validateTaskTitle(input.title) ??
    validateAmount(input.amount) ??
    validateCursor(input.cursor) ??
    validateStartTime(input.startTime) ??
    validateRepeatDays(input.repeatDays) ??
    (TASK_UNITS.includes(input.unit) ? null : "Pick a unit.") ??
    (TIME_LIMITS.includes(input.defaultMinutes) ? null : "Pick a time limit.");
  if (error) throw new TaskValidationError(error);
}

/** Bind values for the task columns, with the cursor cleared for non-sequential units. */
function columns(input: TaskInput) {
  const detail = input.detail?.trim() || null;
  const cursor = usesCursor(input.unit) ? input.cursor : null;
  return [input.title.trim(), detail, input.amount, input.unit, cursor, input.defaultMinutes, input.goalId, input.startTime];
}

async function writeRepeatDays(db: Db, taskId: number, days: readonly number[]): Promise<void> {
  await db.runAsync("DELETE FROM repeat_days WHERE task_id = ?", [taskId]);
  for (const day of new Set(days)) {
    await db.runAsync("INSERT INTO repeat_days (task_id, weekday) VALUES (?, ?)", [taskId, day]);
  }
}

/** Non-archived tasks, by title. */
export async function list(db: Db): Promise<Task[]> {
  return db.getAllAsync<Task>(
    "SELECT * FROM tasks WHERE archived_at IS NULL ORDER BY title COLLATE NOCASE, id",
    [],
  );
}

/** Non-archived tasks with their repeat days, for the plan builder. */
export async function listWithRepeatDays(db: Db): Promise<TaskWithRepeats[]> {
  const [rows, days] = await Promise.all([
    list(db),
    db.getAllAsync<{ task_id: number; weekday: number }>(
      "SELECT task_id, weekday FROM repeat_days ORDER BY weekday",
      [],
    ),
  ]);
  return rows.map((task) => ({
    ...task,
    repeat_days: days.filter((d) => d.task_id === task.id).map((d) => d.weekday),
  }));
}

export async function get(db: Db, id: number): Promise<Task | null> {
  return db.getFirstAsync<Task>("SELECT * FROM tasks WHERE id = ?", [id]);
}

export async function create(db: Db, input: TaskInput): Promise<Task> {
  validate(input);
  let id = 0;
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO tasks (title, detail, amount, unit, cursor, default_minutes, goal_id, start_time, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [...columns(input), nowSeconds()],
    );
    id = result.lastInsertRowId;
    await writeRepeatDays(db, id, input.repeatDays);
  });
  return (await get(db, id))!;
}

/** Changes apply to future plans only: saved plan items keep their snapshot. */
export async function update(db: Db, id: number, input: TaskInput): Promise<void> {
  validate(input);
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `UPDATE tasks SET title = ?, detail = ?, amount = ?, unit = ?, cursor = ?, default_minutes = ?,
         goal_id = ?, start_time = ? WHERE id = ?`,
      [...columns(input), id],
    );
    if (result.changes === 0) throw new Error(`Task ${id} does not exist.`);
    await writeRepeatDays(db, id, input.repeatDays);
  });
}

/** Archived tasks leave the picker and stop repeating; their history stays. */
export async function archive(db: Db, id: number): Promise<void> {
  await db.runAsync("UPDATE tasks SET archived_at = ? WHERE id = ? AND archived_at IS NULL", [
    nowSeconds(),
    id,
  ]);
}

export async function repeatDays(db: Db, taskId: number): Promise<number[]> {
  const rows = await db.getAllAsync<{ weekday: number }>(
    "SELECT weekday FROM repeat_days WHERE task_id = ? ORDER BY weekday",
    [taskId],
  );
  return rows.map((r) => r.weekday);
}
