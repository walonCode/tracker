import { nowSeconds } from "@/domain/clock";
import { today } from "@/domain/dates";
import { validateDueDate, validateReason, validateTitle } from "@/domain/goalRules";

import type { Db, Goal } from "../types";

export class ActiveGoalExists extends Error {
  constructor() {
    super("An active goal already exists. Complete or drop it first.");
    this.name = "ActiveGoalExists";
  }
}

export class GoalValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoalValidationError";
  }
}

export async function getActive(db: Db): Promise<Goal | null> {
  return db.getFirstAsync<Goal>("SELECT * FROM goals WHERE status = 'active'", []);
}

export async function create(db: Db, input: { title: string; dueDate: string }): Promise<Goal> {
  const error = validateTitle(input.title) ?? validateDueDate(input.dueDate, today());
  if (error) throw new GoalValidationError(error);
  if (await getActive(db)) throw new ActiveGoalExists();

  try {
    const result = await db.runAsync(
      "INSERT INTO goals (title, due_date, status, created_at) VALUES (?, ?, 'active', ?)",
      [input.title.trim(), input.dueDate, nowSeconds()],
    );
    const goal = await db.getFirstAsync<Goal>("SELECT * FROM goals WHERE id = ?", [
      result.lastInsertRowId,
    ]);
    return goal!;
  } catch (e) {
    // The one_active_goal index catches a create that raced past the check.
    if (e instanceof Error && /UNIQUE/.test(e.message)) throw new ActiveGoalExists();
    throw e;
  }
}

async function close(db: Db, id: number, status: "completed" | "dropped", reason: string | null) {
  const result = await db.runAsync(
    "UPDATE goals SET status = ?, drop_reason = ?, closed_at = ? WHERE id = ? AND status = 'active'",
    [status, reason, nowSeconds(), id],
  );
  if (result.changes === 0) throw new Error(`Goal ${id} is not active.`);
}

export async function complete(db: Db, id: number): Promise<void> {
  await close(db, id, "completed", null);
}

export async function drop(db: Db, id: number, reason: string): Promise<void> {
  const error = validateReason(reason);
  if (error) throw new GoalValidationError(error);
  await close(db, id, "dropped", reason.trim());
}

export async function listClosed(db: Db): Promise<Goal[]> {
  return db.getAllAsync<Goal>(
    "SELECT * FROM goals WHERE status != 'active' ORDER BY closed_at DESC, id DESC",
    [],
  );
}
