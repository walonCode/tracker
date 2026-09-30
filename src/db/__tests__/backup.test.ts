import { openTestDb, type TestDb } from "../../../test/nodeDb";
import { seedDevData } from "@/dev/seed";
import { resetClockSource, setClockSource } from "@/domain/clock";
import { addDays, today } from "@/domain/dates";
import { initDatabase } from "../client";
import { canImport, exportData, importData, ImportError, TABLES } from "../repos/backup";
import * as goals from "../repos/goals";
import * as log from "../repos/log";

const open: TestDb[] = [];

async function freshDb(): Promise<TestDb> {
  const db = openTestDb();
  open.push(db);
  await initDatabase(db);
  return db;
}

async function counts(db: TestDb): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  for (const table of TABLES) {
    result[table] = (await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`, []))!.n;
  }
  return result;
}

/** FNV-1a over a string. */
function checksum(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/** A checksum of what the Log shows: every day's minutes and every entry. */
async function logChecksum(db: TestDb): Promise<number> {
  const minutes = await log.dailyMinutes(db, "2000-01-01", addDays(today(), 1));
  const entries = await log.entries(db, 10_000, 0);
  return checksum(JSON.stringify({ minutes, entries }));
}

beforeEach(() => {
  setClockSource(() => Date.parse("2026-09-30T16:00:00Z"));
});

afterEach(() => {
  while (open.length) open.pop()!.close();
  resetClockSource();
});

describe("export and import", () => {
  it("round-trips the seeded database", async () => {
    const source = await freshDb();
    await seedDevData(source);
    const text = JSON.stringify(await exportData(source));

    const target = await freshDb();
    // A first-run goal may exist before import; it is replaced.
    await goals.create(target, { title: "Temporary goal", dueDate: "2026-12-31" });
    expect(await canImport(target)).toBe(true);
    await importData(target, text);

    expect(await counts(target)).toEqual(await counts(source));
    expect(await logChecksum(target)).toBe(await logChecksum(source));
  });

  it("is refused once plans or sessions exist", async () => {
    const source = await freshDb();
    await seedDevData(source);
    const text = JSON.stringify(await exportData(source));
    expect(await canImport(source)).toBe(false);
    await expect(importData(source, text)).rejects.toBeInstanceOf(ImportError);
  });

  it("validates the schema version and rolls back on a bad row", async () => {
    const source = await freshDb();
    await seedDevData(source);
    const file = await exportData(source);

    const target = await freshDb();
    await expect(importData(target, "not json")).rejects.toBeInstanceOf(ImportError);
    await expect(importData(target, JSON.stringify({ ...file, schemaVersion: 99 }))).rejects.toBeInstanceOf(
      ImportError,
    );

    const broken = structuredClone(file);
    broken.tables.sessions.push({ id: 999_999, plan_item_id: 1, state: "bogus", started_at: 0 });
    await expect(importData(target, JSON.stringify(broken))).rejects.toThrow();
    expect(Object.values(await counts(target)).every((n) => n === 0)).toBe(true);

    const injected = structuredClone(file);
    injected.tables.goals[0] = { "id) VALUES (1); DROP TABLE goals; --": 1 };
    await expect(importData(target, JSON.stringify(injected))).rejects.toBeInstanceOf(ImportError);
  });
});
