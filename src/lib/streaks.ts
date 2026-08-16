/**
 * Pure streak (current / longest consecutive-day run) computation.
 *
 * Zero React Native / Skia imports — plain data in, plain data out, mirroring
 * `src/lib/contribution-graph.ts`'s split. Built entirely on top of
 * `src/lib/dates.ts`'s local-day helpers so a streak's notion of "day" always
 * matches the device's local calendar day, same as every other tracker
 * concept in this app.
 */

import { diffInLocalDays, isValidLocalDateKey, parseLocalDateKey } from "./dates";

export interface StreakResult {
  /**
   * Consecutive days ending today or yesterday, counting backward. Has one
   * day of grace: if the most recent active day was yesterday (not today),
   * the streak is still "current" — today isn't over yet. It only resets to
   * 0 once more than 1 day has elapsed since the last active day.
   */
  current: number;
  /** Longest consecutive-day run found anywhere in the supplied dates. */
  longest: number;
}

export interface ComputeStreaksOptions {
  /** The "today" the current streak is measured against. Defaults to `new Date()`. */
  today?: Date;
}

/**
 * Computes current + longest streaks from a list of "YYYY-MM-DD" local-date
 * keys, each representing one day that had at least one qualifying entry
 * (the caller decides what "qualifying" means — a single tracker's entries,
 * or the union of every tracker in a domain). Duplicate and invalid keys are
 * ignored; input order doesn't matter.
 */
export function computeStreaks(
  dateKeys: readonly string[],
  options: ComputeStreaksOptions = {}
): StreakResult {
  const unique = Array.from(new Set(dateKeys.filter(isValidLocalDateKey))).sort();
  if (unique.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i++) {
    const gap = diffInLocalDays(parseLocalDateKey(unique[i]), parseLocalDateKey(unique[i - 1]));
    run = gap === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  const today = options.today ?? new Date();
  const lastKey = unique[unique.length - 1];
  const gapFromToday = diffInLocalDays(today, parseLocalDateKey(lastKey));
  if (gapFromToday > 1) {
    // More than a day has passed since the last active day — the streak is
    // broken, regardless of how long the run leading up to it was.
    return { current: 0, longest };
  }

  let current = 1;
  for (let i = unique.length - 1; i > 0; i--) {
    const gap = diffInLocalDays(parseLocalDateKey(unique[i]), parseLocalDateKey(unique[i - 1]));
    if (gap === 1) current += 1;
    else break;
  }
  return { current, longest };
}
