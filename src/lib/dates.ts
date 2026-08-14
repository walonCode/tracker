/**
 * Local-day boundary helpers.
 *
 * A "day" for a habit/prayer tracker means the device's local calendar day,
 * not a UTC day boundary — a prayer logged at 11pm and one logged at 1am the
 * next morning must land in different buckets even though they're less than
 * two hours apart in UTC terms. All helpers here operate purely on Date
 * components (year/month/day) and contain zero React Native / Skia imports,
 * so they're safe to call from any headless context (tests, a future
 * Android home-screen widget, etc).
 */

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Returns `date`'s local calendar day as a "YYYY-MM-DD" key. */
export function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Today's local calendar day as a "YYYY-MM-DD" key. */
export function todayLocalDateKey(): string {
  return toLocalDateKey(new Date());
}

/**
 * Parses a "YYYY-MM-DD" key into a local-midnight `Date`. Throws if `key`
 * isn't in that exact format.
 */
export function parseLocalDateKey(key: string): Date {
  const match = DATE_KEY_PATTERN.exec(key);
  if (!match) {
    throw new Error(`Invalid local date key: "${key}"`);
  }
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * True if `key` is a syntactically valid "YYYY-MM-DD" date key representing
 * a real calendar date (e.g. "2026-02-30" is rejected via a round-trip
 * check, since `Date` would otherwise silently roll it into March).
 */
export function isValidLocalDateKey(key: string): boolean {
  if (!DATE_KEY_PATTERN.test(key)) return false;
  const parsed = parseLocalDateKey(key);
  return toLocalDateKey(parsed) === key;
}

/** Returns a new `Date` set to local midnight of the same calendar day as `date`. */
export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Returns a new `Date` offset by `days` local calendar days (may be negative or zero). */
export function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Whole number of local calendar days between two dates (`a` minus `b`). */
export function diffInLocalDays(a: Date, b: Date): number {
  const startA = startOfLocalDay(a).getTime();
  const startB = startOfLocalDay(b).getTime();
  return Math.round((startA - startB) / MS_PER_DAY);
}

/** True if `a` and `b` fall on the same local calendar day. */
export function isSameLocalDay(a: Date, b: Date): boolean {
  return toLocalDateKey(a) === toLocalDateKey(b);
}
