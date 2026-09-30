import type { LocalDate } from "@/domain/dates";
import type { TaskWithRepeats } from "@/domain/planBuilder";

import type { Db, EndReason, PlanItem, Task, TaskUnit } from "../types";

// Read-only queries behind the Log screen.

export interface DayMinutes {
  plan_date: LocalDate;
  seconds: number;
}

export async function dailyMinutes(db: Db, from: LocalDate, to: LocalDate, taskId?: number): Promise<DayMinutes[]> {
  const byTask = taskId === undefined ? "" : " AND task_id = ?";
  return db.getAllAsync<DayMinutes>(
    `SELECT plan_date, SUM(used_seconds) AS seconds FROM plan_items
     WHERE plan_date BETWEEN ? AND ?${byTask} GROUP BY plan_date ORDER BY plan_date`,
    taskId === undefined ? [from, to] : [from, to, taskId],
  );
}

/** Dates in the range on which the task's plan item is `done`. */
export async function dailyHits(db: Db, from: LocalDate, to: LocalDate, taskId: number): Promise<LocalDate[]> {
  const rows = await db.getAllAsync<{ plan_date: LocalDate }>(
    `SELECT plan_date FROM plan_items
     WHERE plan_date BETWEEN ? AND ? AND task_id = ? AND status = 'done' ORDER BY plan_date`,
    [from, to, taskId],
  );
  return rows.map((r) => r.plan_date);
}

/** Dates in the range on which the task had a plan item (for the run counter). */
export async function scheduledDates(db: Db, taskId: number, from: LocalDate, to: LocalDate): Promise<LocalDate[]> {
  const rows = await db.getAllAsync<{ plan_date: LocalDate }>(
    "SELECT plan_date FROM plan_items WHERE task_id = ? AND plan_date BETWEEN ? AND ? ORDER BY plan_date",
    [taskId, from, to],
  );
  return rows.map((r) => r.plan_date);
}

export interface DaySession {
  id: number;
  plan_item_id: number;
  note: string | null;
  cursor_from: number | null;
  cursor_to: number | null;
  amount_done: number | null;
  end_reason: EndReason | null;
}

export interface DayDetailItem extends PlanItem {
  title: string;
  unit: TaskUnit;
  sessions: DaySession[];
}

/** The date's plan items in order, each with its sessions. */
export async function dayDetail(db: Db, date: LocalDate): Promise<DayDetailItem[]> {
  const [items, sessionRows] = await Promise.all([
    db.getAllAsync<PlanItem & { title: string; unit: TaskUnit }>(
      `SELECT p.*, t.title, t.unit FROM plan_items p JOIN tasks t ON t.id = p.task_id
       WHERE p.plan_date = ? ORDER BY p.position, p.id`,
      [date],
    ),
    db.getAllAsync<DaySession>(
      `SELECT s.id, s.plan_item_id, s.note, s.cursor_from, s.cursor_to, s.amount_done, s.end_reason
       FROM sessions s JOIN plan_items p ON p.id = s.plan_item_id
       WHERE p.plan_date = ? AND s.state = 'ended' ORDER BY s.started_at`,
      [date],
    ),
  ]);
  return items.map((item) => ({ ...item, sessions: sessionRows.filter((s) => s.plan_item_id === item.id) }));
}

export interface Entry {
  id: number;
  plan_date: LocalDate;
  label_snapshot: string;
  unit: TaskUnit;
  note: string | null;
  amount_done: number | null;
  cursor_from: number | null;
  cursor_to: number | null;
  end_reason: EndReason | null;
}

/** Ended sessions with a note or an amount, newest first. */
export async function entries(db: Db, limit: number, offset: number, taskId?: number): Promise<Entry[]> {
  const byTask = taskId === undefined ? "" : " AND p.task_id = ?";
  const params = taskId === undefined ? [limit, offset] : [taskId, limit, offset];
  return db.getAllAsync<Entry>(
    `SELECT s.id, p.plan_date, p.label_snapshot, t.unit, s.note, s.amount_done, s.cursor_from, s.cursor_to, s.end_reason
     FROM sessions s
     JOIN plan_items p ON p.id = s.plan_item_id
     JOIN tasks t ON t.id = p.task_id
     WHERE s.state = 'ended' AND (s.note IS NOT NULL OR s.amount_done IS NOT NULL)${byTask}
     ORDER BY s.started_at DESC, s.id DESC LIMIT ? OFFSET ?`,
    params,
  );
}

/** Filter chips: non-archived tasks with at least one plan item. */
export async function tasksWithHistory(db: Db): Promise<TaskWithRepeats[]> {
  const rows = await db.getAllAsync<Task & { repeat_list: string | null }>(
    `SELECT t.*, (SELECT GROUP_CONCAT(weekday) FROM repeat_days r WHERE r.task_id = t.id) AS repeat_list
     FROM tasks t
     WHERE t.archived_at IS NULL AND EXISTS (SELECT 1 FROM plan_items p WHERE p.task_id = t.id)
     ORDER BY t.title COLLATE NOCASE, t.id`,
    [],
  );
  return rows.map(({ repeat_list, ...task }) => ({
    ...task,
    repeat_days: repeat_list ? repeat_list.split(",").map(Number) : [],
  }));
}
