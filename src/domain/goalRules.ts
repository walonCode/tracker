import { daysBetween, type LocalDate } from "./dates";

// Shared by the goal screens and the goals repo. Each validator returns an
// error message for the user, or null when the value is valid.

export const TEXT_MIN = 3;
export const TEXT_MAX = 140;

function validateText(value: string, what: string): string | null {
  const length = value.trim().length;
  if (length < TEXT_MIN) return `${what} needs at least ${TEXT_MIN} characters.`;
  if (length > TEXT_MAX) return `${what} can have at most ${TEXT_MAX} characters.`;
  return null;
}

export function validateTitle(title: string): string | null {
  return validateText(title, "The goal");
}

export function validateReason(reason: string): string | null {
  return validateText(reason, "The reason");
}

export function validateDueDate(dueDate: LocalDate | null, today: LocalDate): string | null {
  if (!dueDate) return "Pick a due date.";
  if (daysBetween(today, dueDate) < 0) return "Pick today or a later date.";
  return null;
}

/** Days from today to the due date, never negative. */
export function daysLeft(dueDate: LocalDate, today: LocalDate): number {
  return Math.max(0, daysBetween(today, dueDate));
}
