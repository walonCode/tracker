import type { Db, Task, TaskUnit, TimeLimit } from "../types";
import { notImplemented } from "./notImplemented";

// Implemented in plan 3.

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

export async function list(_db: Db): Promise<Task[]> {
  return notImplemented("tasks.list");
}

export async function get(_db: Db, _id: number): Promise<Task | null> {
  return notImplemented("tasks.get");
}

export async function create(_db: Db, _input: TaskInput): Promise<Task> {
  return notImplemented("tasks.create");
}

export async function update(_db: Db, _id: number, _input: TaskInput): Promise<void> {
  return notImplemented("tasks.update");
}

export async function archive(_db: Db, _id: number): Promise<void> {
  return notImplemented("tasks.archive");
}

export async function repeatDays(_db: Db, _taskId: number): Promise<number[]> {
  return notImplemented("tasks.repeatDays");
}
