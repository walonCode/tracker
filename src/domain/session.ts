import type { PlanItem, PlanItemStatus, TaskUnit } from "@/db/types";

import { amountText, usesCursor } from "./labels";
import { limitSeconds } from "./sessionMath";

// Pure rules for the finish check and the Today list.

export const NOTE_MAX = 140;

export type FinishAnswer = { kind: "yes" } | { kind: "partly"; amount: number };

/** The part of the target still to do: `target_amount - done_amount`. */
export function remainingTarget(item: Pick<PlanItem, "target_amount" | "done_amount">): number {
  return Math.max(0, item.target_amount - item.done_amount);
}

export interface FinishResult {
  amountDone: number;
  doneAmount: number;
  status: PlanItemStatus;
  cursorFrom: number | null;
  cursorTo: number | null;
  /** The task's cursor after this session, or null when it has none. */
  nextCursor: number | null;
}

/**
 * Applies a finish-check answer. Yes completes the remaining target;
 * Partly adds 1 to (remaining target - 1) and leaves the item planned
 * unless its limit is used up.
 */
export function applyFinish(
  item: Pick<PlanItem, "target_amount" | "done_amount" | "used_seconds" | "limit_minutes">,
  cursor: number | null,
  answer: FinishAnswer,
): FinishResult {
  const left = remainingTarget(item);
  let amountDone: number;
  if (answer.kind === "yes") {
    amountDone = left;
  } else {
    if (!Number.isInteger(answer.amount) || answer.amount < 1 || answer.amount > left - 1) {
      throw new Error(`Partly needs an amount from 1 to ${left - 1}.`);
    }
    amountDone = answer.amount;
  }

  const limitUsed = item.used_seconds >= limitSeconds(item);
  const status: PlanItemStatus = answer.kind === "yes" || limitUsed ? "done" : "planned";
  const moved = cursor !== null && amountDone > 0;
  return {
    amountDone,
    doneAmount: item.done_amount + amountDone,
    status,
    cursorFrom: moved ? cursor : null,
    cursorTo: moved ? cursor + amountDone - 1 : null,
    nextCursor: cursor === null ? null : cursor + amountDone,
  };
}

/** Partly is possible only when at least 2 units remain. */
export function canAnswerPartly(item: Pick<PlanItem, "target_amount" | "done_amount">): boolean {
  return remainingTarget(item) >= 2;
}

const RANGE_NOUN: Record<"pages" | "verses", [string, string]> = {
  pages: ["Page", "Pages"],
  verses: ["Verse", "Verses"],
};

/**
 * The Session screen's target: `Pages 105 to 106` from the cursor,
 * or `500 words` for a task without one.
 */
export function targetText(unit: TaskUnit, cursor: number | null, amount: number): string {
  if (cursor !== null && usesCursor(unit) && amount > 0) {
    const [one, many] = RANGE_NOUN[unit as "pages" | "verses"];
    return amount === 1 ? `${one} ${cursor}` : `${many} ${cursor} to ${cursor + amount - 1}`;
  }
  return amountText(amount, unit);
}

/** Today's Next card: the first item that is neither done, skipped, nor dropped. */
export function nextItem<T extends Pick<PlanItem, "status">>(items: readonly T[]): T | null {
  return items.find((i) => i.status === "planned") ?? null;
}
