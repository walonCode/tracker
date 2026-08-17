/**
 * Data fetchers shared by the widgets' headless task handler
 * (`widget-task-handler.tsx`) and the widget configuration screen
 * (`src/screens/widget-config`) — both need the exact same "given this
 * instance's persisted options, what should the widget show" computation,
 * so it lives here once instead of being duplicated at each call site.
 *
 * These do real SQLite I/O (via `@/db/repositories`), unlike
 * `@/lib/contribution-graph`, which stays pure — but the day-intensity math
 * itself is still delegated entirely to that module's
 * `computePrayerDailyIntensity` / `computeTrackerDailyIntensity` /
 * `computeAggregateDailyIntensity` / `buildContributionGrid`, per the task
 * brief's "reuse, don't re-derive" instruction.
 */

import { getDb } from "@/db/client";
import {
  getEntriesForDate,
  getEntriesForDateRange,
  getEntriesForTracker,
  getTrackerById,
  listProjects,
  listTrackerFields,
  listTrackers,
  listTrackersByKind,
} from "@/db/repositories";
import {
  buildContributionGrid,
  computeAggregateDailyIntensity,
  computePrayerDailyIntensity,
  computeTrackerDailyIntensity,
  type AggregateDaySource,
  type ContributionGridCell,
  type DayIntensity,
  type PrayerDayRecord,
  type TrackerDayRecord,
} from "@/lib/contribution-graph";
import { addLocalDays, todayLocalDateKey, toLocalDateKey } from "@/lib/dates";
import type {
  ContributionGraphWidgetOptions,
  EntryWithValues,
  FieldType,
  Project,
  ProjectTimeWidgetOptions,
  Tracker,
} from "@/types";

// Mirrors `project-time-summary.tsx`'s exact field-resolution rule: prefer a
// `duration`-typed field, then fall back to any other numeric-ish field.
// Never hardcode a field name.
const NUMERIC_FIELD_TYPES: readonly FieldType[] = ["duration", "number", "scale"];

export const DEFAULT_CONTRIBUTION_RANGE_DAYS = 28;
export const DEFAULT_PROJECT_TIME_RANGE_DAYS = 7;
const MIN_RANGE_DAYS = 7;
const MAX_RANGE_DAYS = 90;

/** Clamps a widget's configured `rangeDays` into a sane, boundable range. */
function clampRangeDays(days: number | undefined, fallback: number): number {
  if (days === undefined || !Number.isFinite(days) || days <= 0) return fallback;
  return Math.min(MAX_RANGE_DAYS, Math.max(MIN_RANGE_DAYS, Math.round(days)));
}

// ---------------------------------------------------------------------------
// Contribution graph widget
// ---------------------------------------------------------------------------

export interface ContributionGraphWidgetData {
  /** Tracker name, or "All trackers" for the aggregate view. */
  title: string;
  weeks: number;
  grid: ContributionGridCell[][];
}

/**
 * Same "did I log this tracker today" per-day signal `use-contribution-preview.ts`
 * builds for the Today screen's aggregate preview, generalized to any single
 * daily range and reused here for the widget's single-tracker (non-prayer) view.
 */
function buildSingleTrackerIntensity(
  tracker: Tracker,
  entries: EntryWithValues[],
  rangeStart: Date,
  days: number
): DayIntensity[] {
  const loggedDates = new Set(
    entries.filter((e) => e.trackerId === tracker.id).map((e) => e.localDate)
  );

  const records: TrackerDayRecord[] = [];
  let cursor = rangeStart;
  for (let i = 0; i < days; i++) {
    const date = toLocalDateKey(cursor);
    records.push({ date, completed: loggedDates.has(date) ? 1 : 0, target: 1 });
    cursor = addLocalDays(cursor, 1);
  }
  return computeTrackerDailyIntensity(records);
}

/**
 * Per-day fard/sunnah split for the prayer tracker, by the same
 * `{prayer}_fard` / `{prayer}_sunnah` field-name convention
 * `use-daily-checklist.ts`'s `computePrayerProgress` uses for "today" —
 * generalized here to a full date range for the widget.
 */
function buildPrayerIntensity(
  tracker: Tracker,
  entries: EntryWithValues[],
  rangeStart: Date,
  days: number
): DayIntensity[] {
  const byDate = new Map<string, { fard: Set<string>; sunnah: boolean }>();
  for (const entry of entries) {
    if (entry.trackerId !== tracker.id) continue;
    let bucket = byDate.get(entry.localDate);
    if (!bucket) {
      bucket = { fard: new Set(), sunnah: false };
      byDate.set(entry.localDate, bucket);
    }
    for (const value of entry.values) {
      if (value.valueBoolean !== true) continue;
      if (value.field.name.endsWith("_fard")) bucket.fard.add(value.field.name);
      else if (value.field.name.endsWith("_sunnah")) bucket.sunnah = true;
    }
  }

  const records: PrayerDayRecord[] = [];
  let cursor = rangeStart;
  for (let i = 0; i < days; i++) {
    const date = toLocalDateKey(cursor);
    const bucket = byDate.get(date);
    records.push({
      date,
      fardCompleted: bucket ? bucket.fard.size : 0,
      sunnahCompleted: bucket?.sunnah ?? false,
    });
    cursor = addLocalDays(cursor, 1);
  }
  return computePrayerDailyIntensity(records);
}

/** Same aggregate-across-all-daily-trackers computation as `use-contribution-preview.ts`. */
function buildAggregateIntensity(
  trackers: Tracker[],
  entries: EntryWithValues[],
  rangeStart: Date,
  days: number
): DayIntensity[] {
  const dailyTrackerIds = new Set(
    trackers.filter((t) => t.frequency === "daily").map((t) => t.id)
  );

  const loggedByDate = new Map<string, Set<number>>();
  for (const entry of entries) {
    if (!dailyTrackerIds.has(entry.trackerId)) continue;
    let loggedTrackerIds = loggedByDate.get(entry.localDate);
    if (!loggedTrackerIds) {
      loggedTrackerIds = new Set();
      loggedByDate.set(entry.localDate, loggedTrackerIds);
    }
    loggedTrackerIds.add(entry.trackerId);
  }

  const sources: AggregateDaySource[] = [];
  let cursor = rangeStart;
  for (let i = 0; i < days; i++) {
    const date = toLocalDateKey(cursor);
    const loggedTrackerIds = loggedByDate.get(date);
    for (const trackerId of dailyTrackerIds) {
      sources.push({ date, value: loggedTrackerIds?.has(trackerId) ? 1 : 0 });
    }
    cursor = addLocalDays(cursor, 1);
  }
  return computeAggregateDailyIntensity(sources);
}

/**
 * Builds the contribution-graph widget's content for one instance's
 * options: which tracker (undefined = all-trackers aggregate) and how many
 * trailing days. Applies the prayer tracker's fard-brightness/sunnah-dot
 * special case exactly like the in-app graph when the configured tracker
 * happens to be `kind: "prayer"`.
 */
export async function fetchContributionGraphWidgetData(
  options: ContributionGraphWidgetOptions
): Promise<ContributionGraphWidgetData> {
  const db = await getDb();
  const rangeDays = clampRangeDays(options.rangeDays, DEFAULT_CONTRIBUTION_RANGE_DAYS);
  const weeks = Math.max(1, Math.ceil(rangeDays / 7));
  const days = weeks * 7;
  const today = new Date();
  const rangeStart = addLocalDays(today, -(days - 1));
  const startDate = toLocalDateKey(rangeStart);
  const endDate = toLocalDateKey(today);

  const entries = await getEntriesForDateRange(db, startDate, endDate);
  const tracker =
    options.trackerId !== undefined ? await getTrackerById(db, options.trackerId) : null;

  let data: DayIntensity[];
  let title: string;

  if (tracker && tracker.kind === "prayer") {
    data = buildPrayerIntensity(tracker, entries, rangeStart, days);
    title = tracker.name;
  } else if (tracker) {
    data = buildSingleTrackerIntensity(tracker, entries, rangeStart, days);
    title = tracker.name;
  } else {
    const allTrackers = await listTrackers(db, {});
    data = buildAggregateIntensity(allTrackers, entries, rangeStart, days);
    title = "All trackers";
  }

  const grid = buildContributionGrid(data, weeks, { endDate: today });
  return { title, weeks, grid };
}

// ---------------------------------------------------------------------------
// Project time widget
// ---------------------------------------------------------------------------

export interface ProjectTimeWidgetRow {
  title: string;
  total: number;
  unit: string | null;
}

export interface ProjectTimeWidgetData {
  rangeLabel: string;
  rangeDays: number;
  total: number;
  unit: string | null;
  rows: ProjectTimeWidgetRow[];
}

/**
 * Builds the project-time widget's content: total logged (and a per-project
 * breakdown) for either one configured project or all active projects,
 * summed over the instance's configured range. Reuses the exact
 * field-resolution + summation approach `project-time-summary.tsx` (Reports,
 * task 9) uses, per the brief's reuse note — including fetching each
 * project's entries via `getEntriesForTracker` and filtering to the range
 * client-side, so this widget's total matches Reports' for the same range.
 */
export async function fetchProjectTimeWidgetData(
  options: ProjectTimeWidgetOptions
): Promise<ProjectTimeWidgetData> {
  const db = await getDb();
  const rangeDays = clampRangeDays(options.rangeDays, DEFAULT_PROJECT_TIME_RANGE_DAYS);
  const today = new Date();
  const rangeStart = addLocalDays(today, -(rangeDays - 1));
  const startDate = toLocalDateKey(rangeStart);
  const endDate = toLocalDateKey(today);

  let projects: Project[];
  if (options.projectId !== undefined) {
    const all = await listProjects(db, {});
    projects = all.filter((p) => p.id === options.projectId);
  } else {
    projects = await listProjects(db, { status: "active" });
  }

  const rows: ProjectTimeWidgetRow[] = [];
  for (const project of projects) {
    const fields = await listTrackerFields(db, project.trackerId);
    const field =
      fields.find((f) => f.type === "duration") ??
      fields.find((f) => NUMERIC_FIELD_TYPES.includes(f.type)) ??
      null;

    if (!field) {
      rows.push({ title: project.title, total: 0, unit: null });
      continue;
    }

    const entries = await getEntriesForTracker(db, project.trackerId);
    let total = 0;
    for (const entry of entries) {
      if (entry.localDate < startDate || entry.localDate > endDate) continue;
      const value = entry.values.find((v) => v.fieldId === field.id)?.valueNumber;
      if (value !== null && value !== undefined) total += value;
    }
    rows.push({ title: project.title, total, unit: field.unit });
  }

  rows.sort((a, b) => b.total - a.total);
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  // Assumes a consistent unit across the summed projects (true for the
  // seeded example project's "min" duration field) — the widget shows a
  // single combined total rather than converting/normalizing mixed units.
  const unit = rows.find((row) => row.total > 0)?.unit ?? rows.find((row) => row.unit)?.unit ?? null;
  const rangeLabel = rangeDays === 7 ? "this week" : `last ${rangeDays} days`;

  return { rangeLabel, rangeDays, total, unit, rows };
}

// ---------------------------------------------------------------------------
// Prayer widget
// ---------------------------------------------------------------------------

const PRAYER_WIDGET_ORDER = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
const PRAYER_WIDGET_LABELS: Record<(typeof PRAYER_WIDGET_ORDER)[number], string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

export interface PrayerWidgetRow {
  label: string;
  fardDone: boolean;
  sunnahDone: boolean;
}

export interface PrayerWidgetData {
  fardDone: number;
  sunnahDone: number;
  total: number;
  rows: PrayerWidgetRow[];
}

/**
 * Builds today's fard/sunnah status per prayer, for the single `kind:
 * "prayer"` tracker — always "today", no per-instance options (unlike the
 * other two widgets, there's nothing to configure: there's only one prayer
 * tracker and it's never scoped to a date range). Field association is via
 * the same `{prayer}_fard`/`{prayer}_sunnah` name-suffix convention every
 * other prayer-aware reader in this codebase uses (see
 * `use-daily-checklist.ts`'s `computePrayerProgress`), never the field
 * label.
 */
export async function fetchPrayerWidgetData(): Promise<PrayerWidgetData> {
  const db = await getDb();
  const [prayerTrackers, todaysEntries] = await Promise.all([
    listTrackersByKind(db, "prayer"),
    getEntriesForDate(db, todayLocalDateKey()),
  ]);

  const tracker = prayerTrackers[0] ?? null;
  const doneFieldNames = new Set<string>();
  if (tracker) {
    for (const entry of todaysEntries) {
      if (entry.trackerId !== tracker.id) continue;
      for (const value of entry.values) {
        if (value.valueBoolean === true) doneFieldNames.add(value.field.name);
      }
    }
  }

  const rows: PrayerWidgetRow[] = PRAYER_WIDGET_ORDER.map((key) => ({
    label: PRAYER_WIDGET_LABELS[key],
    fardDone: doneFieldNames.has(`${key}_fard`),
    sunnahDone: doneFieldNames.has(`${key}_sunnah`),
  }));

  return {
    fardDone: rows.filter((r) => r.fardDone).length,
    sunnahDone: rows.filter((r) => r.sunnahDone).length,
    total: rows.length,
    rows,
  };
}
