import { nowSeconds } from "@/domain/clock";
import { today } from "@/domain/dates";
import { applyFinish, NOTE_MAX, type FinishAnswer } from "@/domain/session";
import { elapsed, limitReachedAt, limitSeconds, remaining } from "@/domain/sessionMath";

import type { Db, EndReason, PlanItem, Session, Task } from "../types";

export class SessionAlreadyOpen extends Error {
  constructor() {
    super("A session is already running. Stop it first.");
    this.name = "SessionAlreadyOpen";
  }
}

export class SessionNotAllowed extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionNotAllowed";
  }
}

export interface TimeOptions {
  /** When the change happens, in Unix seconds. Defaults to now. */
  at?: number;
  /** Phone-call time inside the current running stretch (plan 5). */
  pausedMs?: number;
}

export async function get(db: Db, id: number): Promise<Session | null> {
  return db.getFirstAsync<Session>("SELECT * FROM sessions WHERE id = ?", [id]);
}

export async function getOpen(db: Db): Promise<Session | null> {
  return db.getFirstAsync<Session>("SELECT * FROM sessions WHERE is_open = 1", []);
}

async function requireItem(db: Db, planItemId: number): Promise<PlanItem> {
  const item = await db.getFirstAsync<PlanItem>("SELECT * FROM plan_items WHERE id = ?", [planItemId]);
  if (!item) throw new Error(`Plan item ${planItemId} does not exist.`);
  return item;
}

async function requireOpen(db: Db, sessionId: number): Promise<Session> {
  const session = await get(db, sessionId);
  if (!session || session.is_open !== 1) throw new Error(`Session ${sessionId} is not open.`);
  return session;
}

/** Starts a session on one of today's planned items that still has time left. */
export async function start(db: Db, planItemId: number): Promise<Session> {
  const now = nowSeconds();
  const item = await requireItem(db, planItemId);
  if (item.plan_date !== today()) throw new SessionNotAllowed("Only today's tasks can be started.");
  if (item.status !== "planned") throw new SessionNotAllowed("This task is finished for today.");
  if (remaining(item, null, now) <= 0) throw new SessionNotAllowed("This task's time is used up for today.");
  if (await getOpen(db)) throw new SessionAlreadyOpen();

  try {
    const result = await db.runAsync(
      `INSERT INTO sessions (plan_item_id, state, is_open, started_at, resumed_at)
       VALUES (?, 'running', 1, ?, ?)`,
      [planItemId, now, now],
    );
    return (await get(db, result.lastInsertRowId))!;
  } catch (e) {
    // The one_open_session index catches a start that raced past the check.
    if (e instanceof Error && /UNIQUE/.test(e.message)) throw new SessionAlreadyOpen();
    throw e;
  }
}

/**
 * Ends an open session and books its time on the plan item, capped at the
 * item's limit. The item becomes `done` once the limit is used up.
 */
export async function stop(
  db: Db,
  sessionId: number,
  reason: EndReason,
  options: TimeOptions = {},
): Promise<Session> {
  const at = options.at ?? nowSeconds();
  const session = await requireOpen(db, sessionId);
  const item = await requireItem(db, session.plan_item_id);
  const active = Math.min(
    elapsed(session, at, options.pausedMs),
    Math.max(0, limitSeconds(item) - item.used_seconds),
  );
  const used = item.used_seconds + active;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE sessions SET state = 'ended', is_open = NULL, ended_at = ?, active_seconds = ?,
         resumed_at = NULL, end_reason = ? WHERE id = ?`,
      [at, active, reason, sessionId],
    );
    const limitUsed = used >= limitSeconds(item);
    await db.runAsync(
      `UPDATE plan_items SET used_seconds = ?,
         status = CASE WHEN ? = 1 AND status = 'planned' THEN 'done' ELSE status END,
         completed_at = CASE WHEN ? = 1 AND completed_at IS NULL THEN ? ELSE completed_at END
       WHERE id = ?`,
      [used, limitUsed ? 1 : 0, limitUsed ? 1 : 0, at, item.id],
    );
  });
  return (await get(db, sessionId))!;
}

/** Internal, for phone calls (plan 5). There is no user-facing pause. */
export async function pause(db: Db, sessionId: number, options: TimeOptions = {}): Promise<void> {
  const at = options.at ?? nowSeconds();
  const session = await requireOpen(db, sessionId);
  if (session.state !== "running") return;
  await db.runAsync(
    "UPDATE sessions SET state = 'paused', active_seconds = ?, resumed_at = NULL WHERE id = ?",
    [elapsed(session, at, options.pausedMs), sessionId],
  );
}

export async function resume(db: Db, sessionId: number, options: TimeOptions = {}): Promise<void> {
  const at = options.at ?? nowSeconds();
  const session = await requireOpen(db, sessionId);
  if (session.state !== "paused") return;
  await db.runAsync("UPDATE sessions SET state = 'running', resumed_at = ? WHERE id = ?", [at, sessionId]);
}

/**
 * Records the finish check on an ended session: the amount done, the
 * cursor range, and the note; advances the plan item and the task cursor.
 */
export async function finish(db: Db, sessionId: number, answer: FinishAnswer, note: string | null): Promise<void> {
  const session = await get(db, sessionId);
  if (!session || session.state !== "ended") throw new Error(`Session ${sessionId} has not ended.`);
  if (session.finished !== null) throw new Error(`Session ${sessionId} already has a finish check.`);
  const item = await requireItem(db, session.plan_item_id);
  const task = await db.getFirstAsync<Task>("SELECT * FROM tasks WHERE id = ?", [item.task_id]);
  const result = applyFinish(item, task?.cursor ?? null, answer);
  const trimmed = note?.trim().slice(0, NOTE_MAX) || null;
  const now = nowSeconds();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE sessions SET finished = ?, amount_done = ?, cursor_from = ?, cursor_to = ?, note = ? WHERE id = ?`,
      [answer.kind, result.amountDone, result.cursorFrom, result.cursorTo, trimmed, sessionId],
    );
    await db.runAsync(
      `UPDATE plan_items SET done_amount = ?, status = ?,
         completed_at = CASE WHEN ? = 'done' AND completed_at IS NULL THEN ? ELSE completed_at END
       WHERE id = ?`,
      [result.doneAmount, result.status, result.status, now, item.id],
    );
    if (result.nextCursor !== null) {
      await db.runAsync("UPDATE tasks SET cursor = ? WHERE id = ?", [result.nextCursor, item.task_id]);
    }
  });
}

export type Recovery =
  | { kind: "none" }
  | { kind: "session"; sessionId: number }
  | { kind: "finish"; sessionId: number };

/**
 * Run at every app start and foreground return. A running session whose
 * limit already passed ends at the limit time (not now) and goes to the
 * finish check; any other open session returns to the Session screen.
 */
export async function reconcileOpenSession(
  db: Db,
  options: { at?: number; pausedMsFor?: (session: Session) => number } = {},
): Promise<Recovery> {
  const now = options.at ?? nowSeconds();
  const open = await getOpen(db);
  if (!open) return { kind: "none" };
  const item = await requireItem(db, open.plan_item_id);
  const pausedMs = options.pausedMsFor?.(open) ?? 0;
  if (open.state === "paused" || remaining(item, open, now, pausedMs) > 0) {
    return { kind: "session", sessionId: open.id };
  }
  const endsAt = limitReachedAt(item, open, pausedMs) ?? now;
  await stop(db, open.id, "limit", { at: Math.min(endsAt, now), pausedMs });
  return { kind: "finish", sessionId: open.id };
}
