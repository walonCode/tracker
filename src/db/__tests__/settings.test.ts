import { openTestDb, type TestDb } from "../../../test/nodeDb";
import { initDatabase } from "../client";
import * as settings from "../repos/settings";

let db: TestDb;

beforeEach(async () => {
  db = openTestDb();
  await initDatabase(db);
});

afterEach(() => db.close());

it("returns null for a missing key, then the latest value", async () => {
  expect(await settings.get(db, "k")).toBeNull();
  await settings.set(db, "k", "a");
  await settings.set(db, "k", "b");
  expect(await settings.get(db, "k")).toBe("b");
});
