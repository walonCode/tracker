import type { Db, PlanItem } from "../types";
import { notImplemented } from "./notImplemented";

// Implemented in plans 3 and 4.

export interface PlanItemInput {
  taskId: number;
  planDate: string;
  position: number;
  labelSnapshot: string;
  limitMinutes: number;
  targetAmount: number;
}

export async function listByDate(_db: Db, _date: string): Promise<PlanItem[]> {
  return notImplemented("planItems.listByDate");
}

export async function insert(_db: Db, _items: PlanItemInput[]): Promise<void> {
  return notImplemented("planItems.insert");
}

export async function reorder(_db: Db, _date: string, _orderedIds: number[]): Promise<void> {
  return notImplemented("planItems.reorder");
}

export async function skip(_db: Db, _id: number): Promise<void> {
  return notImplemented("planItems.skip");
}
