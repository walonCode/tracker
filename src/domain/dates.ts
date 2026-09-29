import { nowSeconds } from "./clock";

// Dates are local `YYYY-MM-DD` strings; the day boundary is local midnight.
// Calendar arithmetic runs on UTC dates so DST shifts never skip or repeat
// a day.

export type LocalDate = string;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function parse(date: LocalDate): { y: number; m: number; d: number } {
  const match = DATE_PATTERN.exec(date);
  if (!match) throw new Error(`Invalid local date: ${date}`);
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function toUtcMs(date: LocalDate): number {
  const { y, m, d } = parse(date);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): LocalDate {
  const dt = new Date(ms);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

/** Local calendar date of a Unix-seconds timestamp. */
export function localDate(seconds: number): LocalDate {
  const dt = new Date(seconds * 1000);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

/** Today's local date, read from the replaceable clock. */
export function today(): LocalDate {
  return localDate(nowSeconds());
}

export function addDays(date: LocalDate, n: number): LocalDate {
  return fromUtcMs(toUtcMs(date) + n * MS_PER_DAY);
}

/** Weekday with Monday = 0 through Sunday = 6. */
export function weekdayOf(date: LocalDate): number {
  return (new Date(toUtcMs(date)).getUTCDay() + 6) % 7;
}

export function mondayOf(date: LocalDate): LocalDate {
  return addDays(date, -weekdayOf(date));
}

/** Whole days from `a` to `b` (positive when `b` is later). */
export function daysBetween(a: LocalDate, b: LocalDate): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / MS_PER_DAY);
}

/** Unix seconds at local wall-clock time `hh:mm` on `date`. */
export function localTimeToSeconds(date: LocalDate, hhmm = "00:00"): number {
  const { y, m, d } = parse(date);
  const [hh, mm] = hhmm.split(":").map(Number);
  return Math.floor(new Date(y, m - 1, d, hh, mm).getTime() / 1000);
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `Mon 28 Sep`, with the year appended when it differs from `reference`'s. */
export function formatDate(date: LocalDate, reference?: LocalDate): string {
  const { y, m, d } = parse(date);
  const base = `${WEEKDAYS[weekdayOf(date)]} ${d} ${MONTHS[m - 1]}`;
  return reference && parse(reference).y === y ? base : `${base} ${y}`;
}

/**
 * Under one hour: a clock reading, `mm:ss` (`38:12`).
 * One hour or more: `1 h 35 min`, or `2 h` on a whole hour.
 */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  if (total < 3600) {
    return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
  }
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}
