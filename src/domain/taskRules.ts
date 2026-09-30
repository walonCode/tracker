import { TEXT_MAX, TEXT_MIN } from "./goalRules";

// Shared by the task form and the tasks repo. Each validator returns an
// error message for the user, or null when the value is valid.

export const AMOUNT_MIN = 1;
export const AMOUNT_MAX = 999;

const START_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateTaskTitle(title: string): string | null {
  const length = title.trim().length;
  if (length < TEXT_MIN) return `The task needs at least ${TEXT_MIN} characters.`;
  if (length > TEXT_MAX) return `The task can have at most ${TEXT_MAX} characters.`;
  return null;
}

export function validateAmount(amount: number): string | null {
  if (!Number.isInteger(amount) || amount < AMOUNT_MIN || amount > AMOUNT_MAX) {
    return `The amount must be a whole number from ${AMOUNT_MIN} to ${AMOUNT_MAX}.`;
  }
  return null;
}

export function validateCursor(cursor: number | null): string | null {
  if (cursor === null) return null;
  return Number.isInteger(cursor) && cursor >= 1 ? null : "The start must be 1 or more.";
}

/** `hh:mm`, 24-hour. */
export function validateStartTime(startTime: string | null): string | null {
  if (startTime === null) return null;
  return START_TIME_PATTERN.test(startTime) ? null : "Use a time like 07:30.";
}

export function validateRepeatDays(days: readonly number[]): string | null {
  return days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) ? null : "Invalid weekday.";
}
