// The subset of the expo-sqlite database API the app relies on. Repos take
// this interface rather than `SQLiteDatabase` so tests can run them against
// Node's built-in SQLite.

export type BindValue = string | number | null;

export interface RunResult {
  lastInsertRowId: number;
  changes: number;
}

export interface Db {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: BindValue[]): Promise<RunResult>;
  getFirstAsync<T>(source: string, params: BindValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, params: BindValue[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

// Row shapes, one per table in migration 1. Timestamps are Unix seconds;
// dates are local `YYYY-MM-DD` strings.

export type GoalStatus = "active" | "completed" | "dropped";

export interface Goal {
  id: number;
  title: string;
  due_date: string;
  status: GoalStatus;
  drop_reason: string | null;
  created_at: number;
  closed_at: number | null;
}

export const TASK_UNITS = ["pages", "verses", "words", "sets", "papers", "min"] as const;
export type TaskUnit = (typeof TASK_UNITS)[number];

export const TIME_LIMITS = [15, 30, 50, 90] as const;
export type TimeLimit = (typeof TIME_LIMITS)[number];

export interface Task {
  id: number;
  title: string;
  detail: string | null;
  amount: number;
  unit: TaskUnit;
  cursor: number | null;
  default_minutes: TimeLimit;
  goal_id: number | null;
  start_time: string | null;
  archived_at: number | null;
  created_at: number;
}

export type PlanItemStatus = "planned" | "done" | "skipped" | "dropped";

export interface PlanItem {
  id: number;
  task_id: number;
  plan_date: string;
  position: number;
  label_snapshot: string;
  limit_minutes: number;
  target_amount: number;
  done_amount: number;
  used_seconds: number;
  status: PlanItemStatus;
  completed_at: number | null;
}

export type SessionState = "running" | "paused" | "ended";
export type EndReason = "limit" | "finished" | "stopped" | "early_exit";

export interface Session {
  id: number;
  plan_item_id: number;
  state: SessionState;
  is_open: 1 | null;
  started_at: number;
  resumed_at: number | null;
  ended_at: number | null;
  active_seconds: number;
  end_reason: EndReason | null;
  finished: "yes" | "partly" | null;
  amount_done: number | null;
  cursor_from: number | null;
  cursor_to: number | null;
  note: string | null;
}

export interface AllowedApp {
  package_name: string;
  label: string;
}
