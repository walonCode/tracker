import { openTestDb, type TestDb } from "../../../test/nodeDb";
import { resetClockSource, setClockSource } from "@/domain/clock";
import { initDatabase } from "../client";
import * as planItems from "../repos/planItems";
import * as tasks from "../repos/tasks";
import type { TaskInput } from "../repos/tasks";

// Noon on Tuesday 2026-09-29 in New York.
const NOW = Date.parse("2026-09-29T16:00:00Z");
const TODAY = "2026-09-29";
const TOMORROW = "2026-09-30";

let db: TestDb;

const quran: TaskInput = {
  title: "Read Quran",
  detail: null,
  amount: 2,
  unit: "pages",
  cursor: 105,
  defaultMinutes: 15,
  goalId: null,
  startTime: "05:30",
  repeatDays: [0, 1, 2, 3, 4, 5, 6],
};

beforeEach(async () => {
  setClockSource(() => NOW);
  db = openTestDb();
  await initDatabase(db);
});

afterEach(() => {
  db.close();
  resetClockSource();
});

describe("tasks repo", () => {
  it("creates a task with repeat days and clears the cursor for non-sequential units", async () => {
    const created = await tasks.create(db, quran);
    expect(created).toMatchObject({ title: "Read Quran", cursor: 105, unit: "pages" });
    expect(await tasks.repeatDays(db, created.id)).toEqual([0, 1, 2, 3, 4, 5, 6]);

    const gym = await tasks.create(db, { ...quran, title: "Gym", unit: "sets", cursor: 4, repeatDays: [0, 2] });
    expect(gym.cursor).toBeNull();
  });

  it("rejects a short title and a zero amount", async () => {
    await expect(tasks.create(db, { ...quran, title: "ab" })).rejects.toBeInstanceOf(tasks.TaskValidationError);
    await expect(tasks.create(db, { ...quran, amount: 0 })).rejects.toBeInstanceOf(tasks.TaskValidationError);
  });

  it("archives a task out of the list", async () => {
    const created = await tasks.create(db, quran);
    await tasks.archive(db, created.id);
    expect(await tasks.list(db)).toEqual([]);
    expect((await tasks.get(db, created.id))?.archived_at).not.toBeNull();
  });

  it("editing a task's amount does not change saved label snapshots", async () => {
    const created = await tasks.create(db, quran);
    await planItems.insert(db, [
      { taskId: created.id, planDate: TOMORROW, position: 0, labelSnapshot: "Read Quran 2 pages from p.105", limitMinutes: 15, targetAmount: 2 },
    ]);
    await tasks.update(db, created.id, { ...quran, amount: 4 });
    expect((await tasks.get(db, created.id))?.amount).toBe(4);
    const [saved] = await planItems.listByDate(db, TOMORROW);
    expect(saved).toMatchObject({ label_snapshot: "Read Quran 2 pages from p.105", target_amount: 2 });
  });
});

describe("plan items locking", () => {
  let taskId: number;
  const row = (planDate: string) => ({
    taskId,
    planDate,
    position: 0,
    labelSnapshot: "x",
    limitMinutes: 15,
    targetAmount: 2,
  });

  beforeEach(async () => {
    taskId = (await tasks.create(db, quran)).id;
  });

  it("rejects inserts dated today or earlier", async () => {
    await expect(planItems.insert(db, [row(TODAY)])).rejects.toBeInstanceOf(planItems.PlanLockedError);
    await expect(planItems.insert(db, [row("2026-09-28")])).rejects.toBeInstanceOf(planItems.PlanLockedError);
    await expect(planItems.insert(db, [row(TOMORROW)])).resolves.toHaveLength(1);
  });

  it("allows a first plan for today only while today is empty", async () => {
    await planItems.insert(db, [row(TODAY)], { firstPlanToday: true });
    await expect(planItems.insert(db, [row(TODAY)], { firstPlanToday: true })).rejects.toBeInstanceOf(
      planItems.PlanLockedError,
    );
  });

  it("rejects reordering today", async () => {
    await expect(planItems.reorder(db, TODAY, [])).rejects.toBeInstanceOf(planItems.PlanLockedError);
  });

  it("saves a plan: new rows, order, and carryover drops", async () => {
    const other = (await tasks.create(db, { ...quran, title: "Write thesis", unit: "words", amount: 500 })).id;
    await planItems.insert(db, [row(TODAY)], { firstPlanToday: true });
    const [todayItem] = await planItems.listByDate(db, TODAY);
    const [savedId] = await planItems.insert(db, [row(TOMORROW)]);

    await planItems.savePlan(db, {
      date: TOMORROW,
      items: [
        { planItemId: null, taskId: other, label: "Write thesis, 500 words", limitMinutes: 90, targetAmount: 500 },
        { planItemId: savedId, taskId, label: "x", limitMinutes: 15, targetAmount: 2 },
      ],
      dropIds: [todayItem.id],
    });

    const saved = await planItems.listByDate(db, TOMORROW);
    expect(saved.map((s) => [s.task_id, s.position])).toEqual([
      [other, 0],
      [taskId, 1],
    ]);
    expect((await planItems.get(db, todayItem.id))?.status).toBe("dropped");
  });

  it("skips a planned item of today", async () => {
    await planItems.insert(db, [row(TODAY)], { firstPlanToday: true });
    const [todayItem] = await planItems.listByDate(db, TODAY);
    await planItems.skip(db, todayItem.id);
    expect((await planItems.get(db, todayItem.id))?.status).toBe("skipped");
    await expect(planItems.skip(db, todayItem.id)).rejects.toThrow();
  });
});
