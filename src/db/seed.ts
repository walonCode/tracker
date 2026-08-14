import type { SQLiteDatabase } from "expo-sqlite";

import type { CreateEntryValueInput } from "./repositories/entries";
import { createEntry } from "./repositories/entries";
import { getDomainByKey, listDomains } from "./repositories/domains";
import { createTracker, listTrackers, listTrackersByKind } from "./repositories/trackers";
import { createTrackerField } from "./repositories/tracker-fields";
import { createProjectWithTracker, listProjects } from "./repositories/projects";
import { createProjectPage } from "./repositories/project-pages";
import { createProjectBlock } from "./repositories/project-blocks";
import type { Domain, DomainKey } from "@/types";

// ===========================================================================
// Core seed — the 4 fixed domains + the built-in prayer tracker. Idempotent
// (checks before inserting) and safe to call on every app boot. This is the
// only seed that should ship to real users.
// ===========================================================================

interface DomainSeed {
  key: DomainKey;
  label: string;
  color: string;
  icon: string;
  sortOrder: number;
}

const CORE_DOMAINS: DomainSeed[] = [
  { key: "daily", label: "Daily", color: "#34C759", icon: "sun.max", sortOrder: 0 },
  { key: "finance", label: "Finance", color: "#30B0C7", icon: "dollarsign.circle", sortOrder: 1 },
  { key: "projects", label: "Projects", color: "#AF52DE", icon: "folder", sortOrder: 2 },
  { key: "others", label: "Others", color: "#8E8E93", icon: "ellipsis.circle", sortOrder: 3 },
];

const PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
const PRAYER_LABELS: Record<(typeof PRAYERS)[number], string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

/** Seeds the 4 fixed domains, once. No-op if any domain already exists. */
async function seedDomains(db: SQLiteDatabase): Promise<void> {
  const existing = await listDomains(db);
  if (existing.length > 0) return;

  for (const domain of CORE_DOMAINS) {
    await db.runAsync(
      "INSERT INTO domains (key, label, color, icon, sort_order, is_system) VALUES (?, ?, ?, ?, ?, 1)",
      [domain.key, domain.label, domain.color, domain.icon, domain.sortOrder]
    );
  }
}

/**
 * Seeds the single kind='prayer' tracker (domain: daily) with its 10
 * boolean fields (fard + sunnah for each of the 5 daily prayers).
 * No-op if a prayer tracker already exists.
 */
async function seedPrayerTracker(db: SQLiteDatabase): Promise<void> {
  const existing = await listTrackersByKind(db, "prayer");
  if (existing.length > 0) return;

  const dailyDomain = await getDomainByKey(db, "daily");
  if (!dailyDomain) {
    throw new Error("seedPrayerTracker: 'daily' domain missing — seedDomains must run first");
  }

  const tracker = await createTracker(db, {
    domainId: dailyDomain.id,
    name: "Prayer",
    frequency: "daily",
    kind: "prayer",
    sortOrder: 0,
  });

  let sortOrder = 0;
  for (const prayer of PRAYERS) {
    await createTrackerField(db, {
      trackerId: tracker.id,
      name: `${prayer}_fard`,
      label: `${PRAYER_LABELS[prayer]} (Fard)`,
      type: "boolean",
      sortOrder: sortOrder++,
    });
    await createTrackerField(db, {
      trackerId: tracker.id,
      name: `${prayer}_sunnah`,
      label: `${PRAYER_LABELS[prayer]} (Sunnah)`,
      type: "boolean",
      sortOrder: sortOrder++,
    });
  }
}

/**
 * Seeds core, fixed application data: the 4 domains and the prayer tracker.
 * Idempotent — safe to call on every app boot.
 */
export async function seedCore(db: SQLiteDatabase): Promise<void> {
  await seedDomains(db);
  await seedPrayerTracker(db);
}

// ===========================================================================
// Example data — a handful of illustrative trackers/entries/project across
// the 4 domains, purely so later phases have real data to render against
// during development. Deliberately kept in its own function so it is easy
// to stop calling before shipping to real users (see seedDatabase() below).
// ===========================================================================

function daysAgoIso(daysAgo: number): { occurredAt: string; localDate: string } {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const occurredAt = date.toISOString();
  return { occurredAt, localDate: occurredAt.slice(0, 10) };
}

interface ExampleEntrySeed {
  daysAgo: number;
  note?: string;
  values: CreateEntryValueInput[];
}

async function createExampleEntries(
  db: SQLiteDatabase,
  trackerId: number,
  entries: ExampleEntrySeed[]
): Promise<void> {
  for (const seed of entries) {
    const { occurredAt, localDate } = daysAgoIso(seed.daysAgo);
    await createEntry(db, {
      trackerId,
      occurredAt,
      localDate,
      note: seed.note ?? null,
      values: seed.values,
    });
  }
}

async function trackerExists(
  db: SQLiteDatabase,
  domainId: number,
  name: string
): Promise<boolean> {
  const trackers = await listTrackers(db, { domainId, includeArchived: true });
  return trackers.some((t) => t.name === name);
}

async function seedWaterTracker(db: SQLiteDatabase, domain: Domain): Promise<void> {
  const name = "Water Intake";
  if (await trackerExists(db, domain.id, name)) return;

  const tracker = await createTracker(db, {
    domainId: domain.id,
    name,
    frequency: "daily",
    kind: "standard",
    icon: "drop",
    sortOrder: 10,
  });
  const amountField = await createTrackerField(db, {
    trackerId: tracker.id,
    name: "amount_ml",
    label: "Amount",
    type: "number",
    unit: "ml",
    sortOrder: 0,
  });

  await createExampleEntries(db, tracker.id, [
    { daysAgo: 0, values: [{ fieldId: amountField.id, valueNumber: 1500 }] },
    { daysAgo: 1, values: [{ fieldId: amountField.id, valueNumber: 2000 }] },
  ]);
}

async function seedSpendingTracker(db: SQLiteDatabase, domain: Domain): Promise<void> {
  const name = "Daily Spending";
  if (await trackerExists(db, domain.id, name)) return;

  const tracker = await createTracker(db, {
    domainId: domain.id,
    name,
    frequency: "daily",
    kind: "standard",
    icon: "dollarsign.circle",
    sortOrder: 10,
  });
  const amountField = await createTrackerField(db, {
    trackerId: tracker.id,
    name: "amount",
    label: "Amount",
    type: "number",
    unit: "$",
    sortOrder: 0,
  });
  const categoryField = await createTrackerField(db, {
    trackerId: tracker.id,
    name: "category",
    label: "Category",
    type: "text",
    sortOrder: 1,
  });

  await createExampleEntries(db, tracker.id, [
    {
      daysAgo: 0,
      note: "Groceries",
      values: [
        { fieldId: amountField.id, valueNumber: 42.5 },
        { fieldId: categoryField.id, valueText: "Groceries" },
      ],
    },
    {
      daysAgo: 2,
      note: "Coffee",
      values: [
        { fieldId: amountField.id, valueNumber: 4.75 },
        { fieldId: categoryField.id, valueText: "Coffee" },
      ],
    },
  ]);
}

async function seedMoodTracker(db: SQLiteDatabase, domain: Domain): Promise<void> {
  const name = "Mood";
  if (await trackerExists(db, domain.id, name)) return;

  const tracker = await createTracker(db, {
    domainId: domain.id,
    name,
    frequency: "daily",
    kind: "standard",
    icon: "face.smiling",
    sortOrder: 10,
  });
  const moodField = await createTrackerField(db, {
    trackerId: tracker.id,
    name: "mood",
    label: "Mood",
    type: "scale",
    config: { min: 1, max: 5 },
    sortOrder: 0,
  });

  await createExampleEntries(db, tracker.id, [
    { daysAgo: 0, values: [{ fieldId: moodField.id, valueNumber: 4 }] },
    { daysAgo: 1, values: [{ fieldId: moodField.id, valueNumber: 3 }] },
  ]);
}

async function seedExampleProject(db: SQLiteDatabase, domain: Domain): Promise<void> {
  const title = "Personal Website";
  const existingProjects = await listProjects(db);
  if (existingProjects.some((p) => p.title === title)) return;

  const { project, tracker } = await createProjectWithTracker(db, {
    domainId: domain.id,
    title,
    description: "Example project seeded for development.",
    icon: "globe",
  });

  const minutesField = await createTrackerField(db, {
    trackerId: tracker.id,
    name: "minutes",
    label: "Minutes",
    type: "duration",
    unit: "min",
    sortOrder: 0,
  });

  await createExampleEntries(db, tracker.id, [
    { daysAgo: 0, note: "Worked on layout", values: [{ fieldId: minutesField.id, valueNumber: 45 }] },
  ]);

  const page = await createProjectPage(db, { projectId: project.id, title: "Notes", sortOrder: 0 });
  await createProjectBlock(db, {
    pageId: page.id,
    type: "heading",
    content: "Getting started",
    sortOrder: 0,
  });
  await createProjectBlock(db, {
    pageId: page.id,
    type: "checklist_item",
    content: "Set up repo",
    checked: true,
    sortOrder: 1,
  });
  await createProjectBlock(db, {
    pageId: page.id,
    type: "checklist_item",
    content: "Design homepage",
    checked: false,
    sortOrder: 2,
  });
}

/**
 * Seeds a handful of example trackers/entries/a project across the 4
 * domains, for manual verification during development. NOT part of
 * seedCore() — keep this call out of production seeding paths once the app
 * ships to real users.
 */
export async function seedExampleData(db: SQLiteDatabase): Promise<void> {
  const domains = await listDomains(db);
  const domainByKey = new Map(domains.map((d) => [d.key, d]));

  const daily = domainByKey.get("daily");
  const finance = domainByKey.get("finance");
  const projects = domainByKey.get("projects");
  const others = domainByKey.get("others");

  if (daily) await seedWaterTracker(db, daily);
  if (finance) await seedSpendingTracker(db, finance);
  if (projects) await seedExampleProject(db, projects);
  if (others) await seedMoodTracker(db, others);
}

/**
 * Runs the full seed: core (domains + prayer tracker) followed by example
 * data. Current build stage calls this by default from app startup — see
 * seedCore()/seedExampleData() to split these apart before shipping.
 */
export async function seedDatabase(db: SQLiteDatabase): Promise<void> {
  await seedCore(db);
  await seedExampleData(db);
}
