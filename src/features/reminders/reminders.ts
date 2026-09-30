import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

import * as planItems from "@/db/repos/planItems";
import * as settings from "@/db/repos/settings";
import type { Db } from "@/db/types";
import { nowSeconds } from "@/domain/clock";
import { addDays, today } from "@/domain/dates";
import { REMINDER_DAYS, reminderSlots } from "@/domain/reminders";

// Local start-time reminders: the only notifications besides the focus
// service's own. Rebuilt from plan items on plan save, app start, task
// edit, and task archive.

const CHANNEL_ID = "task-start";
const ASKED_KEY = "reminder_permission_asked";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Task start",
    importance: Notifications.AndroidImportance.LOW,
    enableVibrate: false,
    sound: null,
  });
}

/** Asks once, the first time a task gets a start time, never at first launch. */
export async function requestReminderPermission(db: Db): Promise<void> {
  if ((await settings.get(db, ASKED_KEY)) !== null) return;
  await settings.set(db, ASKED_KEY, "1");
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (!current.granted) await Notifications.requestPermissionsAsync();
}

/** Replaces every scheduled reminder with one per planned item with a start time in the next 7 days. */
export async function rescheduleReminders(db: Db): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;
  await ensureChannel();

  const from = today();
  const items = await planItems.listWithStartTimes(db, from, addDays(from, REMINDER_DAYS - 1));
  for (const reminder of reminderSlots(items, from, nowSeconds())) {
    await Notifications.scheduleNotificationAsync({
      content: { title: reminder.title, body: "Time to start", data: { planItemId: reminder.planItemId } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(reminder.at * 1000),
        channelId: CHANNEL_ID,
      },
    });
  }
}

/** Fire-and-forget rebuild; a failure only means reminders are stale until the next rebuild. */
export function refreshReminders(db: Db): void {
  rescheduleReminders(db).catch(() => {});
}

/** Root layout: a tapped reminder opens Today with its item as the Next card. */
export function useReminderTaps(): void {
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (response?.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const planItemId = response.notification.request.content.data?.planItemId;
    if (typeof planItemId !== "number") return;
    router.navigate({ pathname: "/", params: { next: String(planItemId) } });
  }, [response]);
}
