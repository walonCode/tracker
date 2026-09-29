import type { Db, Goal } from "../types";
import { notImplemented } from "./notImplemented";

// Implemented in plan 2.

export async function getActive(_db: Db): Promise<Goal | null> {
  return notImplemented("goals.getActive");
}

export async function create(_db: Db, _input: { title: string; dueDate: string }): Promise<Goal> {
  return notImplemented("goals.create");
}

export async function complete(_db: Db, _id: number): Promise<void> {
  return notImplemented("goals.complete");
}

export async function drop(_db: Db, _id: number, _reason: string): Promise<void> {
  return notImplemented("goals.drop");
}

export async function listClosed(_db: Db): Promise<Goal[]> {
  return notImplemented("goals.listClosed");
}
