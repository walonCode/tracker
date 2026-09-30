import type { TaskUnit } from "@/db/types";

import { amountText } from "./labels";

// Wording for Log rows.

/** `pages 105 to 106`, or `page 105` for a single unit. */
export function rangeText(unit: TaskUnit, from: number, to: number): string {
  if (from === to) return amountText(1, unit).replace(/^1 /, "") + ` ${from}`;
  return `${unit} ${from} to ${to}`;
}

/** An entry's first line: the cursor range when there is one, else the planned label. */
export function entryLabel(entry: {
  label_snapshot: string;
  unit: TaskUnit;
  cursor_from: number | null;
  cursor_to: number | null;
}): string {
  if (entry.cursor_from !== null && entry.cursor_to !== null) {
    return rangeText(entry.unit, entry.cursor_from, entry.cursor_to);
  }
  return entry.label_snapshot;
}

/**
 * A plan item in day detail: `Read Quran 2 pages from p.126, 15 of 15 min`
 * once its target is met, else the amount so far, `Read papers, 1 of 2`.
 */
export function dayItemText(item: {
  title: string;
  label_snapshot: string;
  used_seconds: number;
  limit_minutes: number;
  done_amount: number;
  target_amount: number;
}): string {
  if (item.done_amount >= item.target_amount) {
    return `${item.label_snapshot}, ${Math.round(item.used_seconds / 60)} of ${item.limit_minutes} min`;
  }
  return `${item.title}, ${item.done_amount} of ${item.target_amount}`;
}
