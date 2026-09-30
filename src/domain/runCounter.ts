import { addDays, daysBetween, weekdayOf, type LocalDate } from "./dates";

export interface RunInput {
  today: LocalDate;
  /** Local date the task was created. */
  createdOn: LocalDate;
  repeatDays: readonly number[];
  /** Dates with a plan item for the task. */
  plannedDates: ReadonlySet<LocalDate>;
  /** Dates whose plan item is `done`. */
  doneDates: ReadonlySet<LocalDate>;
}

/** Scheduled: a plan item that day, or a repeat day on or after the task was created. */
function isScheduled(input: RunInput, date: LocalDate): boolean {
  if (input.plannedDates.has(date)) return true;
  return daysBetween(input.createdOn, date) >= 0 && input.repeatDays.includes(weekdayOf(date));
}

/**
 * Consecutive scheduled days the task was done, ending today or yesterday.
 * Rest days never break a run, and today does not count against it until
 * it is over.
 */
export function runCounter(input: RunInput): number {
  const earliestPlan = [...input.plannedDates].sort()[0];
  const start = earliestPlan && earliestPlan < input.createdOn ? earliestPlan : input.createdOn;
  let run = 0;
  for (let date = input.today; daysBetween(start, date) >= 0; date = addDays(date, -1)) {
    if (!isScheduled(input, date)) continue;
    if (input.doneDates.has(date)) run += 1;
    else if (date === input.today) continue;
    else break;
  }
  return run;
}
