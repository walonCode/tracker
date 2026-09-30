import { daysBetween, today, type LocalDate } from "@/domain/dates";

import type { Db, PlanItem, TaskUnit } from "../types";

export interface PlanItemInput {
  taskId: number;
  planDate: string;
  position: number;
  labelSnapshot: string;
  limitMinutes: number;
  targetAmount: number;
}

export interface LockOptions {
  /**
   * Allow today's date while today has no items yet, so a day that was
   * never planned can still get its first plan.
   */
  firstPlanToday?: boolean;
}

export class PlanLockedError extends Error {
  constructor(date: LocalDate) {
    super(`The plan for ${date} can no longer be changed.`);
    this.name = "PlanLockedError";
  }
}

// An item with a running or paused session cannot be skipped or dropped.
const NO_OPEN_SESSION = "id NOT IN (SELECT plan_item_id FROM sessions WHERE is_open = 1)";

// Items dated today or earlier change only through the session engine or
// Skip today. Planning writes only to future dates.
async function assertPlannable(db: Db, date: LocalDate, options: LockOptions): Promise<void> {
  const days = daysBetween(today(), date);
  if (days > 0) return;
  if (days === 0 && options.firstPlanToday && (await listByDate(db, date)).length === 0) return;
  throw new PlanLockedError(date);
}

export async function get(db: Db, id: number): Promise<PlanItem | null> {
  return db.getFirstAsync<PlanItem>("SELECT * FROM plan_items WHERE id = ?", [id]);
}

export async function listByDate(db: Db, date: LocalDate): Promise<PlanItem[]> {
  return db.getAllAsync<PlanItem>(
    "SELECT * FROM plan_items WHERE plan_date = ? ORDER BY position, id",
    [date],
  );
}

/** A plan item with the task fields Today and the Session screen show. */
export interface DayItem extends PlanItem {
  title: string;
  detail: string | null;
  unit: TaskUnit;
  cursor: number | null;
}

export async function listDayWithTasks(db: Db, date: LocalDate): Promise<DayItem[]> {
  return db.getAllAsync<DayItem>(
    `SELECT p.*, t.title, t.detail, t.unit, t.cursor FROM plan_items p
     JOIN tasks t ON t.id = p.task_id
     WHERE p.plan_date = ? ORDER BY p.position, p.id`,
    [date],
  );
}

export async function getWithTask(db: Db, id: number): Promise<DayItem | null> {
  return db.getFirstAsync<DayItem>(
    `SELECT p.*, t.title, t.detail, t.unit, t.cursor FROM plan_items p
     JOIN tasks t ON t.id = p.task_id WHERE p.id = ?`,
    [id],
  );
}

/** Plan items in a date range with their task's start time, for reminders and the widget. */
export async function listWithStartTimes(
  db: Db,
  from: LocalDate,
  to: LocalDate,
): Promise<(PlanItem & { start_time: string | null })[]> {
  return db.getAllAsync<PlanItem & { start_time: string | null }>(
    `SELECT p.*, t.start_time FROM plan_items p JOIN tasks t ON t.id = p.task_id
     WHERE p.plan_date BETWEEN ? AND ? ORDER BY p.plan_date, p.position, p.id`,
    [from, to],
  );
}

async function insertRows(db: Db, items: readonly PlanItemInput[]): Promise<number[]> {
  const ids: number[] = [];
  for (const item of items) {
    const result = await db.runAsync(
      `INSERT INTO plan_items (task_id, plan_date, position, label_snapshot, limit_minutes, target_amount)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [item.taskId, item.planDate, item.position, item.labelSnapshot, item.limitMinutes, item.targetAmount],
    );
    ids.push(result.lastInsertRowId);
  }
  return ids;
}

async function reorderRows(db: Db, date: LocalDate, orderedIds: readonly number[]): Promise<void> {
  for (let position = 0; position < orderedIds.length; position++) {
    await db.runAsync("UPDATE plan_items SET position = ? WHERE id = ? AND plan_date = ?", [
      position,
      orderedIds[position],
      date,
    ]);
  }
}

function singleDate(items: readonly PlanItemInput[]): LocalDate | null {
  const dates = new Set(items.map((i) => i.planDate));
  if (dates.size > 1) throw new Error("Plan items must share one date.");
  return items[0]?.planDate ?? null;
}

/** Inserts future plan items. Returns the new ids in input order. */
export async function insert(
  db: Db,
  items: readonly PlanItemInput[],
  options: LockOptions = {},
): Promise<number[]> {
  const date = singleDate(items);
  if (date === null) return [];
  await assertPlannable(db, date, options);
  let ids: number[] = [];
  await db.withTransactionAsync(async () => {
    ids = await insertRows(db, items);
  });
  return ids;
}

/** Sets `position` from the order of `orderedIds` for a future date. */
export async function reorder(db: Db, date: LocalDate, orderedIds: readonly number[]): Promise<void> {
  await assertPlannable(db, date, {});
  await db.withTransactionAsync(() => reorderRows(db, date, orderedIds));
}

export interface SavePlanInput {
  date: LocalDate;
  /** The whole list in order; `planItemId` is null for rows not saved yet. */
  items: readonly {
    planItemId: number | null;
    taskId: number;
    label: string;
    limitMinutes: number;
    targetAmount: number;
  }[];
  /** Today's unfinished items to mark `dropped`. */
  dropIds: readonly number[];
}

/** Save plan: inserts new rows, sets every position, and drops carryover, atomically. */
export async function savePlan(db: Db, input: SavePlanInput, options: LockOptions = {}): Promise<void> {
  await assertPlannable(db, input.date, options);
  const todayDate = today();
  await db.withTransactionAsync(async () => {
    const fresh = input.items
      .map((item, position) => ({ item, position }))
      .filter(({ item }) => item.planItemId === null);
    const freshIds = await insertRows(
      db,
      fresh.map(({ item, position }) => ({
        taskId: item.taskId,
        planDate: input.date,
        position,
        labelSnapshot: item.label,
        limitMinutes: item.limitMinutes,
        targetAmount: item.targetAmount,
      })),
    );
    let next = 0;
    const orderedIds = input.items.map((item) => item.planItemId ?? freshIds[next++]);
    await reorderRows(db, input.date, orderedIds);

    for (const id of input.dropIds) {
      await db.runAsync(
        `UPDATE plan_items SET status = 'dropped'
         WHERE id = ? AND plan_date = ? AND status = 'planned' AND ${NO_OPEN_SESSION}`,
        [id, todayDate],
      );
    }
  });
}

/** Skip today: a planned item of today becomes `skipped`. */
export async function skip(db: Db, id: number): Promise<void> {
  const result = await db.runAsync(
    `UPDATE plan_items SET status = 'skipped'
     WHERE id = ? AND status = 'planned' AND plan_date = ? AND ${NO_OPEN_SESSION}`,
    [id, today()],
  );
  if (result.changes === 0) throw new Error(`Plan item ${id} cannot be skipped.`);
}
