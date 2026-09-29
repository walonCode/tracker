import { openTestDb, type TestDb } from "../../../test/nodeDb";
import { initDatabase } from "@/db/client";
import { resetClockSource, setClockSource } from "@/domain/clock";
import { SEED_DAYS, seedDevData } from "../seed";

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

const count = async (table: string) =>
  (await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`, []))!.n;

it("creates one goal, four tasks and 84 days of plan items once", async () => {
  await seedDevData(db);
  await seedDevData(db);

  expect(await count("goals")).toBe(1);
  expect(await count("tasks")).toBe(4);
  const days = await db.getFirstAsync<{ first: string; last: string; n: number }>(
    "SELECT MIN(plan_date) AS first, MAX(plan_date) AS last, COUNT(DISTINCT plan_date) AS n FROM plan_items",
    [],
  );
  expect(days).toEqual({ first: "2026-07-07", last: "2026-09-28", n: SEED_DAYS });
  expect(await count("sessions")).toBeGreaterThan(100);

  const todayOpen = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM plan_items WHERE plan_date = '2026-09-28' AND status = 'planned' AND used_seconds = 0",
    [],
  );
  expect(todayOpen!.n).toBeGreaterThan(0);
});
