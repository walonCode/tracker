/**
 * Pure day-intensity computation for the contribution graph.
 *
 * Zero React Native / Skia imports — everything here is plain data in, plain
 * data out, so it can run in the app, in tests, or later in a headless
 * context (e.g. an Android home-screen widget) without pulling in a
 * renderer.
 *
 * The generic capability this module exists to provide: a day's *brightness*
 * (`primary`) and a day's *secondary indicator* (`secondary`) are always
 * independent signals. For the prayer tracker specifically, brightness is
 * driven only by the 5 "fard" prayers (0/5 → empty, 5/5 → full brightness)
 * while "sunnah" completion is a small distinct dot/ring — never blended
 * into the fill color. `computePrayerDailyIntensity` below is just one
 * caller of this generic shape; the `ContributionGraph` component and the
 * `DayIntensity` type itself have no prayer-specific knowledge at all.
 */

import { addLocalDays, startOfLocalDay, toLocalDateKey } from "./dates";

/** One day's worth of graph data. Generic across every tracker type. */
export interface DayIntensity {
  /** Local calendar day, "YYYY-MM-DD" (see `src/lib/dates.ts`). */
  date: string;
  /** Fill brightness/alpha for the day's cell, 0 (empty) .. 1 (full). */
  primary: number;
  /**
   * Whether to draw the small secondary indicator (dot/ring). Independent
   * of `primary` — never blended into the main fill color/opacity.
   */
  secondary?: boolean;
}

/** Clamps `value` into the [0, 1] range. `NaN` clamps to 0. */
export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

// ---------------------------------------------------------------------------
// computePrayerDailyIntensity
// ---------------------------------------------------------------------------

/** One day's raw prayer-tracker data, as stored by the data layer. */
export interface PrayerDayRecord {
  /** Local calendar day, "YYYY-MM-DD". */
  date: string;
  /** Count of the 5 fard prayers completed that day, expected 0..5. */
  fardCompleted: number;
  /** Whether sunnah prayers were completed that day (secondary indicator only). */
  sunnahCompleted?: boolean;
}

/**
 * Maps prayer-tracker records to `DayIntensity[]`. Brightness (`primary`)
 * comes only from the 5 fard prayers; `sunnahCompleted` never affects
 * `primary` and only sets the independent `secondary` flag.
 */
export function computePrayerDailyIntensity(
  records: readonly PrayerDayRecord[]
): DayIntensity[] {
  return records.map((record) => ({
    date: record.date,
    primary: clamp01(record.fardCompleted / 5),
    secondary: record.sunnahCompleted === true,
  }));
}

// ---------------------------------------------------------------------------
// computeTrackerDailyIntensity
// ---------------------------------------------------------------------------

/** One day's raw data for any single generic (non-prayer) tracker. */
export interface TrackerDayRecord {
  /** Local calendar day, "YYYY-MM-DD". */
  date: string;
  /** Raw progress units completed that day (e.g. count, minutes, reps). */
  completed: number;
  /** Units that count as "full" for this day. Defaults to the option below, then 1. */
  target?: number;
  /** Optional independent secondary indicator, already decided by the caller. */
  secondary?: boolean;
}

export interface ComputeTrackerDailyIntensityOptions {
  /** Default `target` for records that don't specify their own. Defaults to 1. */
  target?: number;
}

/**
 * Maps a single generic tracker's daily records to `DayIntensity[]`.
 * `primary` is `completed / target`, clamped to [0, 1]. This is the
 * building block `computePrayerDailyIntensity` specializes and that any
 * future boolean/numeric habit tracker can reuse directly.
 */
export function computeTrackerDailyIntensity(
  records: readonly TrackerDayRecord[],
  options: ComputeTrackerDailyIntensityOptions = {}
): DayIntensity[] {
  return records.map((record) => {
    const target = record.target ?? options.target ?? 1;
    const primary = target <= 0 ? 0 : clamp01(record.completed / target);
    const entry: DayIntensity = { date: record.date, primary };
    if (record.secondary === true) entry.secondary = true;
    return entry;
  });
}

// ---------------------------------------------------------------------------
// computeAggregateDailyIntensity
// ---------------------------------------------------------------------------

/** One tracker's already-normalized contribution to a given day. */
export interface AggregateDaySource {
  /** Local calendar day, "YYYY-MM-DD". */
  date: string;
  /** This tracker's contribution for the day, 0..1 (values outside are clamped). */
  value: number;
  /** This tracker's secondary indicator for the day, if any. */
  secondary?: boolean;
}

export type AggregateCombineStrategy = "max" | "average" | "sum";

export interface ComputeAggregateDailyIntensityOptions {
  /** How multiple trackers' values on the same day combine into `primary`. Defaults to "average". */
  combine?: AggregateCombineStrategy;
}

/**
 * Combines multiple trackers' per-day values into one overall `DayIntensity[]`
 * (an "all trackers" view, analogous to GitHub's combined contribution
 * graph). `secondary` is true for a day if ANY source flagged it.
 */
export function computeAggregateDailyIntensity(
  sources: readonly AggregateDaySource[],
  options: ComputeAggregateDailyIntensityOptions = {}
): DayIntensity[] {
  const combine = options.combine ?? "average";
  const byDate = new Map<string, { values: number[]; secondary: boolean }>();

  for (const source of sources) {
    let bucket = byDate.get(source.date);
    if (!bucket) {
      bucket = { values: [], secondary: false };
      byDate.set(source.date, bucket);
    }
    bucket.values.push(clamp01(source.value));
    if (source.secondary === true) bucket.secondary = true;
  }

  const result: DayIntensity[] = [];
  for (const [date, bucket] of byDate) {
    const entry: DayIntensity = {
      date,
      primary: clamp01(combineValues(bucket.values, combine)),
    };
    if (bucket.secondary) entry.secondary = true;
    result.push(entry);
  }

  result.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return result;
}

function combineValues(values: number[], strategy: AggregateCombineStrategy): number {
  if (values.length === 0) return 0;
  switch (strategy) {
    case "max":
      return Math.max(...values);
    case "sum":
      return values.reduce((sum, v) => sum + v, 0);
    case "average":
    default:
      return values.reduce((sum, v) => sum + v, 0) / values.length;
  }
}

// ---------------------------------------------------------------------------
// Grid shaping (consumed by the ContributionGraph component)
// ---------------------------------------------------------------------------

/** One cell of the contribution grid: a calendar day plus its position. */
export interface ContributionGridCell {
  /** Local calendar day, "YYYY-MM-DD". */
  date: string;
  /** This day's intensity, or `null` if no data was supplied for it. */
  intensity: DayIntensity | null;
  /** Column index, 0 = oldest week (leftmost). */
  weekIndex: number;
  /** Row index within the week, 0..6, per `weekStartsOn`. */
  dayOfWeek: number;
}

export interface ContributionGridOptions {
  /** The day the grid should end on (its week's column is the last one). Defaults to today. */
  endDate?: Date;
  /** 0 = Sunday-start weeks (default), 1 = Monday-start weeks. */
  weekStartsOn?: 0 | 1;
}

function localDayOfWeekIndex(date: Date, weekStartsOn: 0 | 1): number {
  const jsDay = date.getDay(); // 0 = Sunday .. 6 = Saturday
  return weekStartsOn === 1 ? (jsDay + 6) % 7 : jsDay;
}

/**
 * Lays out `weeks` columns x 7 rows of calendar days, ending in the week
 * that contains `options.endDate` (defaults to today), oldest column
 * first. Pure and deterministic for a fixed `endDate` — all date-grid math
 * lives here so the `ContributionGraph` component can stay a "dumb"
 * renderer that just maps cells to shapes.
 *
 * Days present in `data` are matched onto the grid by their `date` key;
 * days missing from `data` get `intensity: null`. If `data` contains more
 * than one entry for the same date, the last one wins.
 */
export function buildContributionGrid(
  data: readonly DayIntensity[],
  weeks: number,
  options: ContributionGridOptions = {}
): ContributionGridCell[][] {
  if (weeks <= 0) return [];

  const weekStartsOn = options.weekStartsOn ?? 0;
  const end = startOfLocalDay(options.endDate ?? new Date());
  const endDow = localDayOfWeekIndex(end, weekStartsOn);
  const gridEnd = addLocalDays(end, 6 - endDow);
  const gridStart = addLocalDays(gridEnd, -(weeks * 7 - 1));

  const byDate = new Map<string, DayIntensity>();
  for (const entry of data) byDate.set(entry.date, entry);

  const columns: ContributionGridCell[][] = [];
  let cursor = gridStart;
  for (let weekIndex = 0; weekIndex < weeks; weekIndex++) {
    const column: ContributionGridCell[] = [];
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const key = toLocalDateKey(cursor);
      column.push({
        date: key,
        intensity: byDate.get(key) ?? null,
        weekIndex,
        dayOfWeek,
      });
      cursor = addLocalDays(cursor, 1);
    }
    columns.push(column);
  }
  return columns;
}
