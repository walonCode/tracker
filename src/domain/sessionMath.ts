import type { PlanItem, Session } from "@/db/types";

// Session time is derived from timestamps, never from a running counter,
// so an app kill or a reboot cannot lose time. All functions are pure and
// take `now` in Unix seconds.

type SessionTime = Pick<Session, "state" | "active_seconds" | "resumed_at">;
type ItemTime = Pick<PlanItem, "limit_minutes" | "used_seconds">;

export function limitSeconds(item: Pick<PlanItem, "limit_minutes">): number {
  return item.limit_minutes * 60;
}

/**
 * Active seconds so far. While running, adds the current stretch since
 * `resumed_at`, less `pausedMs` (phone-call time inside that stretch).
 */
export function elapsed(session: SessionTime, now: number, pausedMs = 0): number {
  if (session.state !== "running" || session.resumed_at === null) return session.active_seconds;
  const stretch = Math.max(0, now - session.resumed_at - Math.floor(pausedMs / 1000));
  return session.active_seconds + stretch;
}

/** Seconds used today on the item, including the open session. */
export function usedToday(item: ItemTime, openSession: SessionTime | null, now: number, pausedMs = 0): number {
  return item.used_seconds + (openSession ? elapsed(openSession, now, pausedMs) : 0);
}

/** Seconds left inside the item's limit, never negative. */
export function remaining(item: ItemTime, openSession: SessionTime | null, now: number, pausedMs = 0): number {
  return Math.max(0, limitSeconds(item) - usedToday(item, openSession, now, pausedMs));
}

/** Milliseconds of `intervals` (phone calls) that fall inside `fromMs` to `toMs`. */
export function overlapMs(
  intervals: readonly { startMs: number; endMs: number }[],
  fromMs: number,
  toMs: number,
): number {
  return intervals.reduce(
    (sum, { startMs, endMs }) => sum + Math.max(0, Math.min(endMs, toMs) - Math.max(startMs, fromMs)),
    0,
  );
}

/**
 * When a running session reaches the item's limit, in Unix seconds.
 * Null while paused or ended, since the clock is not moving.
 */
export function limitReachedAt(item: ItemTime, session: SessionTime, pausedMs = 0): number | null {
  if (session.state !== "running" || session.resumed_at === null) return null;
  const left = limitSeconds(item) - item.used_seconds - session.active_seconds;
  return session.resumed_at + Math.floor(pausedMs / 1000) + Math.max(0, left);
}
