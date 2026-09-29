import { openTestDb, type TestDb } from "../../../test/nodeDb";
import { initDatabase } from "../client";
import { getUserVersion, migrations, runMigrations } from "../migrations";

let db: TestDb;

beforeEach(async () => {
  db = openTestDb();
  await initDatabase(db);
});

afterEach(() => db.close());

const schema = (d: TestDb) =>
  d.getAllAsync<{ sql: string }>("SELECT sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY name", []);

describe("migrations", () => {
  it("brings a fresh database to the latest version", async () => {
    expect(migrations).toHaveLength(1);
    expect(await getUserVersion(db)).toBe(1);
  });

  it("is a no-op when run again", async () => {
    const before = await schema(db);
    await runMigrations(db);
    expect(await getUserVersion(db)).toBe(1);
    expect(await schema(db)).toEqual(before);
  });
});

describe("constraints", () => {
  const now = 1_790_000_000;

  it("allows only one active goal", async () => {
    const insert = (title: string, status: string) =>
      db.runAsync("INSERT INTO goals (title, due_date, status, created_at) VALUES (?, '2026-12-31', ?, ?)", [
        title,
        status,
        now,
      ]);
    await insert("First", "active");
    await insert("Old", "completed");
    await insert("Older", "dropped");
    await expect(insert("Second", "active")).rejects.toThrow(/UNIQUE/);
  });

  it("allows only one open session", async () => {
    await db.execAsync(`
      INSERT INTO tasks (id, title, amount, unit, default_minutes, created_at) VALUES (1, 'Read', 2, 'pages', 15, ${now});
      INSERT INTO plan_items (id, task_id, plan_date, position, label_snapshot, limit_minutes, target_amount)
        VALUES (1, 1, '2026-09-28', 0, 'Read, 2 pages', 15, 2);
    `);
    const open = () =>
      db.runAsync("INSERT INTO sessions (plan_item_id, state, is_open, started_at) VALUES (1, 'running', 1, ?)", [now]);
    const ended = () =>
      db.runAsync("INSERT INTO sessions (plan_item_id, state, is_open, started_at) VALUES (1, 'ended', NULL, ?)", [now]);

    await ended();
    await ended();
    await open();
    await expect(open()).rejects.toThrow(/UNIQUE/);
  });

  it("enforces foreign keys", async () => {
    await expect(
      db.runAsync("INSERT INTO repeat_days (task_id, weekday) VALUES (99, 0)", []),
    ).rejects.toThrow(/FOREIGN KEY/);
  });
});
