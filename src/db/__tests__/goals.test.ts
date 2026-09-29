import { openTestDb, type TestDb } from "../../../test/nodeDb";
import { resetClockSource, setClockSource } from "@/domain/clock";
import { initDatabase } from "../client";
import { ActiveGoalExists, complete, create, drop, getActive, GoalValidationError, listClosed } from "../repos/goals";

let db: TestDb;

beforeEach(async () => {
  setClockSource(() => Date.parse("2026-09-28T16:00:00Z"));
  db = openTestDb();
  await initDatabase(db);
});

afterEach(() => {
  db.close();
  resetClockSource();
});

describe("goals repo", () => {
  it("creates a goal with a trimmed title", async () => {
    const goal = await create(db, { title: "  Finish chapter 3  ", dueDate: "2026-10-31" });
    expect(goal).toMatchObject({ title: "Finish chapter 3", status: "active", due_date: "2026-10-31" });
    expect(await getActive(db)).toEqual(goal);
  });

  it("throws ActiveGoalExists for a second active goal", async () => {
    await create(db, { title: "First goal", dueDate: "2026-10-31" });
    await expect(create(db, { title: "Second goal", dueDate: "2026-10-31" })).rejects.toBeInstanceOf(
      ActiveGoalExists,
    );
  });

  it("allows a new goal after completing the previous one", async () => {
    const first = await create(db, { title: "First goal", dueDate: "2026-10-31" });
    await complete(db, first.id);
    const second = await create(db, { title: "Second goal", dueDate: "2026-11-30" });
    expect(second.status).toBe("active");
    expect((await listClosed(db)).map((g) => [g.id, g.status])).toEqual([[first.id, "completed"]]);
  });

  it("rejects a drop without a valid reason and changes nothing", async () => {
    const goal = await create(db, { title: "First goal", dueDate: "2026-10-31" });
    await expect(drop(db, goal.id, "")).rejects.toBeInstanceOf(GoalValidationError);
    await expect(drop(db, goal.id, "no")).rejects.toBeInstanceOf(GoalValidationError);
    expect((await getActive(db))?.id).toBe(goal.id);
  });

  it("drops with a valid reason and stores it", async () => {
    const goal = await create(db, { title: "First goal", dueDate: "2026-10-31" });
    await drop(db, goal.id, "  Changed programme  ");
    expect(await getActive(db)).toBeNull();
    const [closed] = await listClosed(db);
    expect(closed).toMatchObject({ status: "dropped", drop_reason: "Changed programme" });
    expect(closed.closed_at).toBe(Date.parse("2026-09-28T16:00:00Z") / 1000);
  });

  it("validates title and due date on create", async () => {
    await expect(create(db, { title: "ab", dueDate: "2026-10-31" })).rejects.toBeInstanceOf(
      GoalValidationError,
    );
    await expect(create(db, { title: "Valid", dueDate: "2026-09-27" })).rejects.toBeInstanceOf(
      GoalValidationError,
    );
    await expect(create(db, { title: "Valid", dueDate: "2026-09-28" })).resolves.toBeTruthy();
  });

  it("refuses to close a goal that is not active", async () => {
    const goal = await create(db, { title: "First goal", dueDate: "2026-10-31" });
    await complete(db, goal.id);
    await expect(drop(db, goal.id, "Too late")).rejects.toThrow(/not active/);
  });
});
