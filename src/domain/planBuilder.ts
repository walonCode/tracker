import type { PlanItem, Task } from "@/db/types";

import { daysBetween, weekdayOf, type LocalDate } from "./dates";
import { taskLabel } from "./labels";

// Builds the Plan screen's draft. Pure: the caller loads the rows, and
// nothing reaches plan_items until the draft is saved.

export interface TaskWithRepeats extends Task {
  repeat_days: number[];
}

export interface DraftItem {
  /** Stable React key: `item:<id>` for saved rows, `task:<id>` for new ones. */
  key: string;
  taskId: number;
  label: string;
  limitMinutes: number;
  targetAmount: number;
  /** Set when the row is already saved for this date. */
  planItemId: number | null;
}

export interface Draft {
  date: LocalDate;
  items: DraftItem[];
  /** Today's unfinished items waiting for Keep or Drop. */
  unfinished: PlanItem[];
  /** Today's items to mark `dropped` on save. */
  dropIds: number[];
  /** True when the list was prefilled from repeat days. */
  fromRepeats: boolean;
}

export interface DraftSource {
  date: LocalDate;
  today: LocalDate;
  /** Non-archived tasks with their repeat days. */
  tasks: TaskWithRepeats[];
  /** Plan items already saved for `date`. */
  existing: PlanItem[];
  /** Today's plan items (ignored when `date` is not after today). */
  todayItems: PlanItem[];
}

function fromSaved(item: PlanItem): DraftItem {
  return {
    key: `item:${item.id}`,
    taskId: item.task_id,
    label: item.label_snapshot,
    limitMinutes: item.limit_minutes,
    targetAmount: item.target_amount,
    planItemId: item.id,
  };
}

/** A fresh draft row: the task's default limit and amount, or the given target. */
export function draftItemFor(task: Task, targetAmount = task.amount): DraftItem {
  return {
    key: `task:${task.id}`,
    taskId: task.id,
    label: taskLabel({ ...task, amount: targetAmount }),
    limitMinutes: task.default_minutes,
    targetAmount,
    planItemId: null,
  };
}

function byStartTimeThenId(a: Task, b: Task): number {
  if (a.start_time !== b.start_time) {
    if (a.start_time === null) return 1;
    if (b.start_time === null) return -1;
    return a.start_time < b.start_time ? -1 : 1;
  }
  return a.id - b.id;
}

export function buildDraft(source: DraftSource): Draft {
  const { date, tasks } = source;
  let items: DraftItem[];
  let fromRepeats = false;

  if (source.existing.length > 0) {
    items = [...source.existing].sort((a, b) => a.position - b.position).map(fromSaved);
  } else {
    const weekday = weekdayOf(date);
    items = tasks
      .filter((t) => t.archived_at === null && t.repeat_days.includes(weekday))
      .sort(byStartTimeThenId)
      .map((t) => draftItemFor(t));
    fromRepeats = items.length > 0;
  }

  const unfinished: PlanItem[] = [];
  const dropIds: number[] = [];
  if (daysBetween(source.today, date) > 0) {
    const planned = new Set(items.map((i) => i.taskId));
    for (const item of source.todayItems) {
      if (item.status !== "planned") continue;
      // It is on the list for `date` anyway, so it needs no decision.
      if (planned.has(item.task_id)) dropIds.push(item.id);
      else unfinished.push(item);
    }
  }

  return { date, items, unfinished, dropIds, fromRepeats };
}

/** Keep: move today's unfinished item to the top with a full limit and its original target. */
export function keepUnfinished(draft: Draft, item: PlanItem, task: Task): Draft {
  return {
    ...draft,
    items: [draftItemFor(task, item.target_amount), ...draft.items],
    unfinished: draft.unfinished.filter((u) => u.id !== item.id),
  };
}

/** Drop: today's item becomes `dropped` when the plan is saved. */
export function dropUnfinished(draft: Draft, item: PlanItem): Draft {
  return {
    ...draft,
    unfinished: draft.unfinished.filter((u) => u.id !== item.id),
    dropIds: [...draft.dropIds, item.id],
  };
}

/**
 * Append a saved task. A task already in the draft is left alone; one that
 * is waiting under Unfinished is kept instead.
 */
export function addTask(draft: Draft, task: Task): Draft {
  if (draft.items.some((i) => i.taskId === task.id)) return draft;
  const unfinished = draft.unfinished.find((u) => u.task_id === task.id);
  if (unfinished) return keepUnfinished(draft, unfinished, task);
  return { ...draft, items: [...draft.items, draftItemFor(task)] };
}

export function totalMinutes(items: readonly DraftItem[]): number {
  return items.reduce((sum, i) => sum + i.limitMinutes, 0);
}
