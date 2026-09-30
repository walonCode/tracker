import { openTestDb, type TestDb } from "../../../test/nodeDb";
import { resetClockSource, setClockSource } from "@/domain/clock";
import { initDatabase } from "../client";
import * as planItems from "../repos/planItems";
import * as sessions from "../repos/sessions";
import * as tasks from "../repos/tasks";

// 09:00 on Tuesday 2026-09-29 in New York.
const T0 = Date.parse("2026-09-29T13:00:00Z") / 1000;
const TODAY = "2026-09-29";

let db: TestDb;
let now = T0;
let itemId: number;
let taskId: number;

function at(seconds: number) {
  now = T0 + seconds;
}

beforeEach(async () => {
  now = T0;
  setClockSource(() => now * 1000);
  db = openTestDb();
  await initDatabase(db);
  taskId = (
    await tasks.create(db, {
      title: "Read Quran",
      detail: null,
      amount: 4,
      unit: "pages",
      cursor: 105,
      defaultMinutes: 30,
      goalId: null,
      startTime: null,
      repeatDays: [],
    })
  ).id;
  [itemId] = await planItems.insert(
    db,
    [{ taskId, planDate: TODAY, position: 0, labelSnapshot: "Read Quran 4 pages from p.105", limitMinutes: 30, targetAmount: 4 }],
    { firstPlanToday: true },
  );
});

afterEach(() => {
  db.close();
  resetClockSource();
});

describe("session lifecycle", () => {
  it("refuses a second start while a session is open", async () => {
    await sessions.start(db, itemId);
    await expect(sessions.start(db, itemId)).rejects.toBeInstanceOf(sessions.SessionAlreadyOpen);
  });

  it("stop at 12 minutes, start again, and reach the limit: 30 minutes used and done", async () => {
    const first = await sessions.start(db, itemId);
    at(12 * 60);
    await sessions.stop(db, first.id, "stopped");
    expect(await planItems.get(db, itemId)).toMatchObject({ used_seconds: 720, status: "planned" });

    at(20 * 60);
    const second = await sessions.start(db, itemId);
    at(20 * 60 + 18 * 60 + 5); // 5 seconds past the limit
    const ended = await sessions.stop(db, second.id, "limit");
    expect(ended).toMatchObject({ active_seconds: 18 * 60, end_reason: "limit", is_open: null, state: "ended" });
    expect(await planItems.get(db, itemId)).toMatchObject({ used_seconds: 1800, status: "done" });
    await expect(sessions.start(db, itemId)).rejects.toBeInstanceOf(sessions.SessionNotAllowed);
  });

  it("Partly with a cursor advances the cursor by the amount done", async () => {
    const session = await sessions.start(db, itemId);
    at(600);
    await sessions.stop(db, session.id, "stopped");
    await sessions.finish(db, session.id, { kind: "partly", amount: 2 }, "  Slow start  ");

    expect(await sessions.get(db, session.id)).toMatchObject({
      finished: "partly",
      amount_done: 2,
      cursor_from: 105,
      cursor_to: 106,
      note: "Slow start",
    });
    expect(await planItems.get(db, itemId)).toMatchObject({ done_amount: 2, status: "planned" });
    expect((await tasks.get(db, taskId))?.cursor).toBe(107);
  });

  it("Yes before the limit marks the item done and blocks a restart", async () => {
    const session = await sessions.start(db, itemId);
    at(300);
    await sessions.stop(db, session.id, "stopped");
    await sessions.finish(db, session.id, { kind: "yes" }, null);
    expect(await planItems.get(db, itemId)).toMatchObject({ done_amount: 4, status: "done", used_seconds: 300 });
    expect((await tasks.get(db, taskId))?.cursor).toBe(109);
    await expect(sessions.start(db, itemId)).rejects.toBeInstanceOf(sessions.SessionNotAllowed);
  });

  it("pause and resume freeze the clock in between", async () => {
    const session = await sessions.start(db, itemId);
    at(100);
    await sessions.pause(db, session.id);
    at(400);
    await sessions.resume(db, session.id);
    at(450);
    const ended = await sessions.stop(db, session.id, "stopped");
    expect(ended.active_seconds).toBe(150);
  });

  it("an item with an open session cannot be skipped", async () => {
    await sessions.start(db, itemId);
    await expect(planItems.skip(db, itemId)).rejects.toThrow();
  });
});

describe("reconcileOpenSession", () => {
  it("returns to the running session while time remains", async () => {
    const session = await sessions.start(db, itemId);
    at(600);
    expect(await sessions.reconcileOpenSession(db)).toEqual({ kind: "session", sessionId: session.id });
  });

  it("ends a session killed for two hours at the limit time, not now", async () => {
    const session = await sessions.start(db, itemId);
    at(2 * 3600);
    expect(await sessions.reconcileOpenSession(db)).toEqual({ kind: "finish", sessionId: session.id });
    expect(await sessions.get(db, session.id)).toMatchObject({
      ended_at: T0 + 1800,
      active_seconds: 1800,
      end_reason: "limit",
      is_open: null,
    });
    expect(await planItems.get(db, itemId)).toMatchObject({ used_seconds: 1800, status: "done" });
  });

  it("returns to a paused session", async () => {
    const session = await sessions.start(db, itemId);
    at(60);
    await sessions.pause(db, session.id);
    at(7200);
    expect(await sessions.reconcileOpenSession(db)).toEqual({ kind: "session", sessionId: session.id });
  });

  it("does nothing without an open session", async () => {
    expect(await sessions.reconcileOpenSession(db)).toEqual({ kind: "none" });
  });
});
