import type { PlanItem, TaskUnit } from "@/db/types";

import { addTask, buildDraft, dropUnfinished, keepUnfinished, totalMinutes, type TaskWithRepeats } from "../planBuilder";

// 2026-09-30 is a Wednesday (weekday 2); today is Tuesday 2026-09-29.
const TODAY = "2026-09-29";
const WEDNESDAY = "2026-09-30";

function task(id: number, fields: Partial<TaskWithRepeats> = {}): TaskWithRepeats {
  return {
    id,
    title: `Task ${id}`,
    detail: null,
    amount: 2,
    unit: "pages" as TaskUnit,
    cursor: null,
    default_minutes: 30,
    goal_id: null,
    start_time: null,
    archived_at: null,
    created_at: 0,
    repeat_days: [],
    ...fields,
  };
}

function item(id: number, taskId: number, fields: Partial<PlanItem> = {}): PlanItem {
  return {
    id,
    task_id: taskId,
    plan_date: TODAY,
    position: 0,
    label_snapshot: `Item ${id}`,
    limit_minutes: 30,
    target_amount: 2,
    done_amount: 0,
    used_seconds: 0,
    status: "planned",
    completed_at: null,
    ...fields,
  };
}

describe("buildDraft", () => {
  it("prefills a Wednesday from Monday/Wednesday/Friday repeats, by start time then id", () => {
    const tasks = [
      task(1, { repeat_days: [0, 2, 4], start_time: null }),
      task(2, { repeat_days: [0, 2, 4], start_time: "09:00" }),
      task(3, { repeat_days: [1, 3] }),
      task(4, { repeat_days: [0, 2, 4], start_time: "05:30" }),
      task(5, { repeat_days: [2], archived_at: 100 }),
      task(6, { repeat_days: [0, 2, 4] }),
    ];
    const draft = buildDraft({ date: WEDNESDAY, today: TODAY, tasks, existing: [], todayItems: [] });
    expect(draft.items.map((i) => i.taskId)).toEqual([4, 2, 1, 6]);
    expect(draft.fromRepeats).toBe(true);
    expect(draft.items[0]).toMatchObject({ limitMinutes: 30, targetAmount: 2, planItemId: null });
  });

  it("returns a saved plan as it is, ordered by position", () => {
    const tasks = [task(1, { repeat_days: [2] })];
    const existing = [
      item(10, 2, { plan_date: WEDNESDAY, position: 1 }),
      item(11, 3, { plan_date: WEDNESDAY, position: 0 }),
    ];
    const draft = buildDraft({ date: WEDNESDAY, today: TODAY, tasks, existing, todayItems: [] });
    expect(draft.items.map((i) => i.planItemId)).toEqual([11, 10]);
    expect(draft.fromRepeats).toBe(false);
  });

  it("deduplicates an unfinished repeating task and lists an unfinished one-off", () => {
    const tasks = [task(1, { repeat_days: [2] }), task(2)];
    const todayItems = [
      item(20, 1),
      item(21, 2),
      item(22, 3, { status: "done" }),
      item(23, 4, { status: "skipped" }),
    ];
    const draft = buildDraft({ date: WEDNESDAY, today: TODAY, tasks, existing: [], todayItems });
    expect(draft.dropIds).toEqual([20]);
    expect(draft.unfinished.map((u) => u.id)).toEqual([21]);
  });

  it("has no carryover when planning today", () => {
    const draft = buildDraft({ date: TODAY, today: TODAY, tasks: [], existing: [], todayItems: [item(1, 1)] });
    expect(draft.unfinished).toEqual([]);
    expect(draft.dropIds).toEqual([]);
  });
});

describe("draft edits", () => {
  const tasks = [task(1, { repeat_days: [2] }), task(2, { amount: 10, default_minutes: 50 })];
  const unfinished = item(21, 2, { target_amount: 4, used_seconds: 600 });
  const base = () => buildDraft({ date: WEDNESDAY, today: TODAY, tasks, existing: [], todayItems: [unfinished] });

  it("Keep puts the task on top with a full limit and the original target", () => {
    const draft = keepUnfinished(base(), unfinished, tasks[1]);
    expect(draft.items[0]).toMatchObject({ taskId: 2, limitMinutes: 50, targetAmount: 4 });
    expect(draft.items[0].label).toBe("Task 2, 4 pages");
    expect(draft.unfinished).toEqual([]);
  });

  it("Drop queues today's item for dropping", () => {
    const draft = dropUnfinished(base(), unfinished);
    expect(draft.dropIds).toEqual([21]);
    expect(draft.unfinished).toEqual([]);
  });

  it("adding a saved task appends it once", () => {
    const extra = task(3, { default_minutes: 15 });
    const once = addTask(base(), extra);
    const twice = addTask(once, extra);
    expect(twice.items.map((i) => i.taskId)).toEqual([1, 3]);
    expect(totalMinutes(twice.items)).toBe(45);
  });
});
