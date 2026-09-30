import { addDays, daysBetween, mondayOf, type LocalDate } from "./dates";

// The Log's 12-week grid. Fixed thresholds, so a shade means the same
// thing all year.

export const WEEKS = 12;

export type ShadeLevel = 0 | 1 | 2 | 3 | 4;

/** 0 none, 1 up to 30 min, 2 up to 60, 3 up to 120, 4 more than 120. */
export function shadeLevel(minutes: number): ShadeLevel {
  if (minutes <= 0) return 0;
  if (minutes <= 30) return 1;
  if (minutes <= 60) return 2;
  if (minutes <= 120) return 3;
  return 4;
}

export interface GridCell {
  date: LocalDate;
  /** After today: drawn as a dashed outline, never read as a missed day. */
  future: boolean;
}

/**
 * `WEEKS` columns of 7 cells, oldest week first, Monday at the top.
 * The last column is the current week.
 */
export function buildGrid(today: LocalDate, weeks = WEEKS): GridCell[][] {
  const firstMonday = addDays(mondayOf(today), -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const date = addDays(firstMonday, week * 7 + day);
      return { date, future: daysBetween(today, date) > 0 };
    }),
  );
}

export function gridRange(grid: GridCell[][]): { from: LocalDate; to: LocalDate } {
  const last = grid[grid.length - 1];
  return { from: grid[0][0].date, to: last[last.length - 1].date };
}
