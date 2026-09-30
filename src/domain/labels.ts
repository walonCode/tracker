import type { TaskUnit } from "@/db/types";

// The task sentence shown everywhere: plan rows, Today, Session, the log.

const SINGULAR: Record<TaskUnit, string> = {
  pages: "page",
  verses: "verse",
  words: "word",
  sets: "set",
  papers: "paper",
  min: "min",
};

export interface LabelFields {
  title: string;
  amount: number;
  unit: TaskUnit;
  cursor: number | null;
}

/** Only sequential material (pages, verses) has a cursor. */
export function usesCursor(unit: TaskUnit): boolean {
  return unit === "pages" || unit === "verses";
}

/** `p.` for pages, `v.` for verses. */
export function cursorPrefix(unit: TaskUnit): string {
  return unit === "verses" ? "v." : "p.";
}

/** `2 pages`, `1 page`, `500 words`. */
export function amountText(amount: number, unit: TaskUnit): string {
  return `${amount} ${amount === 1 ? SINGULAR[unit] : unit}`;
}

/**
 * `Read Quran 2 pages from p.105` with a cursor,
 * `Write section 3.4, 500 words` without.
 */
export function taskLabel(task: LabelFields): string {
  const amount = amountText(task.amount, task.unit);
  if (task.cursor !== null && usesCursor(task.unit)) {
    return `${task.title} ${amount} from ${cursorPrefix(task.unit)}${task.cursor}`;
  }
  return `${task.title}, ${amount}`;
}
