import { openTestDb, type TestDb } from "../../../../test/nodeDb";
import { initDatabase } from "@/db/client";
import * as settings from "@/db/repos/settings";
import { getStep, ONBOARDING_STEP_KEY, setStep, stepRoute } from "../steps";

let db: TestDb;

beforeEach(async () => {
  db = openTestDb();
  await initDatabase(db);
});

afterEach(() => db.close());

it("starts at the goal step and persists each advance", async () => {
  expect(await getStep(db)).toBe("goal");
  await setStep(db, "permissions");
  expect(await getStep(db)).toBe("permissions");
  expect(stepRoute(await getStep(db))).toBe("/onboarding/permissions");
});

it("falls back to the goal step on an unknown value", async () => {
  await settings.set(db, ONBOARDING_STEP_KEY, "bogus");
  expect(await getStep(db)).toBe("goal");
});
