import { addDays, daysBetween, localTimeToSeconds, type LocalDate } from "./dates";

// Start-time reminders come from plan items, not repeat rules, so skipped,
// dropped, and finished items never produce one.

export const REMINDER_DAYS = 7;

export interface ReminderSource {
  id: number;
  plan_date: LocalDate;
  status: string;
  label_snapshot: string;
  start_time: string | null;
}

export interface Reminder {
  planItemId: number;
  /** Unix seconds. */
  at: number;
  title: string;
}

/** One reminder per planned item with a start time, from now through the next 7 days. */
export function reminderSlots(items: readonly ReminderSource[], today: LocalDate, now: number): Reminder[] {
  const last = addDays(today, REMINDER_DAYS - 1);
  return items
    .filter(
      (item) =>
        item.status === "planned" &&
        item.start_time !== null &&
        daysBetween(today, item.plan_date) >= 0 &&
        daysBetween(item.plan_date, last) >= 0,
    )
    .map((item) => ({
      planItemId: item.id,
      at: localTimeToSeconds(item.plan_date, item.start_time!),
      title: item.label_snapshot,
    }))
    .filter((reminder) => reminder.at > now)
    .sort((a, b) => a.at - b.at);
}
