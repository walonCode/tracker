import type { SQLiteDatabase } from "expo-sqlite";

import { getDomainByKey } from "./repositories/domains";
import { createTracker, listTrackersByKind } from "./repositories/trackers";
import { createTrackerField } from "./repositories/tracker-fields";
import type { DomainKey } from "@/types";

// ===========================================================================
// Core seed — the 5 fixed domains + the built-in prayer tracker. Idempotent
// (checks before inserting) and safe to call on every app boot. This is the
// only seed that ships to real users — there is no example/demo data.
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
  { key: "religion", label: "Religion", color: "#00695C", icon: "moon.stars", sortOrder: 1 },
  { key: "finance", label: "Finance", color: "#30B0C7", icon: "dollarsign.circle", sortOrder: 2 },
  { key: "projects", label: "Projects", color: "#AF52DE", icon: "folder", sortOrder: 3 },
  { key: "others", label: "Others", color: "#8E8E93", icon: "ellipsis.circle", sortOrder: 4 },
];

const PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
const PRAYER_LABELS: Record<(typeof PRAYERS)[number], string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

/**
 * Seeds the 5 fixed domains. Each domain is inserted independently with
 * `INSERT OR IGNORE` keyed on `domains.key` (UNIQUE) rather than gating the
 * whole function on "any domain exists" — that all-or-nothing check would
 * permanently skip backfilling a domain (e.g. "religion", added after this
 * app's initial release) on an install that was already seeded before that
 * domain existed. Safe to call on every app boot either way.
 */
async function seedDomains(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const domain of CORE_DOMAINS) {
      await db.runAsync(
        "INSERT OR IGNORE INTO domains (key, label, color, icon, sort_order, is_system) VALUES (?, ?, ?, ?, ?, 1)",
        [domain.key, domain.label, domain.color, domain.icon, domain.sortOrder]
      );
    }
  });
}

/**
 * Seeds the single kind='prayer' tracker (domain: religion) with its 10
 * boolean fields (fard + sunnah for each of the 5 daily prayers). Lives in
 * its own "Religion" domain rather than "Daily" — domain groups subject
 * matter, frequency (still "daily" here) drives the Today checklist
 * independently of domain, so this doesn't affect checklist membership.
 * No-op if a prayer tracker already exists. The tracker row and all 10
 * field rows are created in one transaction so a crash/error partway
 * through (e.g. after 4 of 10 fields) rolls back cleanly instead of
 * leaving a half-built tracker that `listTrackersByKind` would then
 * treat as "already seeded" on every future boot.
 */
async function seedPrayerTracker(db: SQLiteDatabase): Promise<void> {
  const existing = await listTrackersByKind(db, "prayer");
  if (existing.length > 0) return;

  const religionDomain = await getDomainByKey(db, "religion");
  if (!religionDomain) {
    throw new Error("seedPrayerTracker: 'religion' domain missing — seedDomains must run first");
  }

  await db.withTransactionAsync(async () => {
    const tracker = await createTracker(db, {
      domainId: religionDomain.id,
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
  });
}

/**
 * Seeds core, fixed application data: the 5 domains and the prayer tracker.
 * Idempotent — safe to call on every app boot. This is the only seeding the
 * app performs; users create every other tracker themselves.
 */
export async function seedCore(db: SQLiteDatabase): Promise<void> {
  await seedDomains(db);
  await seedPrayerTracker(db);
}
