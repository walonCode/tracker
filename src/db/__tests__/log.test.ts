import { openTestDb, type TestDb } from "../../../test/nodeDb";
import { seedDevData } from "@/dev/seed";
import { resetClockSource, setClockSource } from "@/domain/clock";
import { addDays, mondayOf, today } from "@/domain/dates";
import { initDatabase } from "../client";
import * as log from "../repos/log";

let db: TestDb;

beforeEach(async () => {
  // Noon on Wednesday 2026-09-30 in New York.
  setClockSource(() => Date.parse("2026-09-30T16:00:00Z"));
  db = openTestDb();
  await initDatabase(db);
  await seedDevData(db);
});

afterEach(() => {
  db.close();
  resetClockSource();
});

interface RawItem {
  id: number;
  task_id: number;
  plan_date: string;
  used_seconds: number;
  status: string;
}

describe("log queries against the dev seed", () => {
  it("dailyMinutes totals for last week match a hand sum of the rows", async () => {
    const from = addDays(mondayOf(today()), -7);
    const to = addDays(from, 6);
    const raw = await db.getAllAsync<RawItem>("SELECT * FROM plan_items", []);
    const expected = raw
      .filter((r) => r.plan_date >= from && r.plan_date <= to)
      .reduce((sum, r) => sum + r.used_seconds, 0);

    const rows = await log.dailyMinutes(db, from, to);
    expect(rows.reduce((sum, r) => sum + r.seconds, 0)).toBe(expected);
    expect(expected).toBeGreaterThan(0);
    expect(rows.every((r) => r.plan_date >= from && r.plan_date <= to)).toBe(true);
  });

  it("dailyHits and scheduledDates follow the task's plan items", async () => {
    const [gym] = await db.getAllAsync<{ id: number }>("SELECT id FROM tasks WHERE title = 'Gym'", []);
    const from = addDays(today(), -27);
    const raw = (await db.getAllAsync<RawItem>("SELECT * FROM plan_items WHERE task_id = ?", [gym.id])).filter(
      (r) => r.plan_date >= from && r.plan_date <= today(),
    );
    expect(await log.scheduledDates(db, gym.id, from, today())).toEqual(raw.map((r) => r.plan_date).sort());
    expect(await log.dailyHits(db, from, today(), gym.id)).toEqual(
      raw.filter((r) => r.status === "done").map((r) => r.plan_date).sort(),
    );
  });

  it("dayDetail returns exactly the date's items with their sessions", async () => {
    const date = addDays(today(), -1);
    const detail = await log.dayDetail(db, date);
    const raw = await db.getAllAsync<RawItem>("SELECT * FROM plan_items WHERE plan_date = ?", [date]);
    expect(detail.map((d) => d.id).sort()).toEqual(raw.map((r) => r.id).sort());
    for (const item of detail) {
      expect(item.sessions.every((s) => s.plan_item_id === item.id)).toBe(true);
    }
  });

  it("entries page newest first and filter by task", async () => {
    const first = await log.entries(db, 30, 0);
    const second = await log.entries(db, 30, 30);
    expect(first).toHaveLength(30);
    expect(first[0].plan_date >= first[29].plan_date).toBe(true);
    expect(first[29].plan_date >= second[0].plan_date).toBe(true);

    const [quran] = await db.getAllAsync<{ id: number }>("SELECT id FROM tasks WHERE title = 'Read Quran'", []);
    const quranEntries = await log.entries(db, 30, 0, quran.id);
    expect(quranEntries.every((e) => e.unit === "pages")).toBe(true);
  });

  it("lists tasks with history and their repeat days", async () => {
    const tasks = await log.tasksWithHistory(db);
    expect(tasks.map((t) => t.title)).toEqual(["Gym", "Read papers", "Read Quran", "Write thesis"]);
    expect(tasks.find((t) => t.title === "Gym")?.repeat_days).toEqual([0, 2, 4]);
  });
});
