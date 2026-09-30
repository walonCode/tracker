import * as Linking from "expo-linking";

import * as planItems from "@/db/repos/planItems";
import type { Db } from "@/db/types";
import { addDays, today } from "@/domain/dates";
import { nextItem } from "@/domain/session";

import FocusModeNative, { type WidgetDay } from "../../../modules/focus-mode";

/**
 * Pushes the Next label for today and tomorrow to the home-screen widget,
 * so it can switch days at midnight on its own. No-op without the module.
 */
export async function updateWidget(db: Db): Promise<void> {
  if (!FocusModeNative) return;
  const from = today();
  const to = addDays(from, 1);
  const items = await planItems.listWithStartTimes(db, from, to);
  const days: WidgetDay[] = [from, to].map((date) => ({
    date,
    label: nextItem(items.filter((i) => i.plan_date === date))?.label_snapshot ?? null,
  }));
  FocusModeNative.updateWidget(days, Linking.createURL("/start-next"));
}

export function refreshWidget(db: Db): void {
  updateWidget(db).catch(() => {});
}
