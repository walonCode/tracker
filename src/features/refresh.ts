import type { Db } from "@/db/types";
import { refreshReminders } from "@/features/reminders/reminders";
import { refreshWidget } from "@/features/widget/widget";

/**
 * Rebuilds everything derived from the plan outside the app: start-time
 * reminders and the home-screen widget. Call after a plan save, a task
 * edit or archive, a skip, and a session's end or finish check.
 */
export function refreshOutputs(db: Db): void {
  refreshReminders(db);
  refreshWidget(db);
}
