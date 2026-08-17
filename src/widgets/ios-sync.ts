/**
 * iOS-only widget data sync: recomputes each of the three home-screen
 * widgets' data (mirroring `./widget-data.ts`'s Android fetchers exactly)
 * and pushes it to the matching `expo-widgets` `Widget` instance via
 * `updateSnapshot`, which both stores the props for the native layout tree
 * to read and asks WidgetKit to reload. See `./ios/*.tsx` for the widget
 * views themselves -- plain React components using `@expo/ui/swift-ui`,
 * no hand-written Swift.
 *
 * Unlike Android's `registerWidgetTaskHandler` (a headless JS task the OS
 * invokes directly, see `./widget-task-handler.tsx`), a WidgetKit extension
 * can't run arbitrary app JS on its own -- it only replays whatever layout
 * tree + props were last pushed here. So this module's job is exactly that
 * push, run from the main app whenever the user is likely about to look at
 * their home screen, not a live query from the widget's own process.
 */
import { Platform } from "react-native";

import { contributionGraphWidget } from "./ios/contribution-graph-widget";
import { prayerWidget } from "./ios/prayer-widget";
import { projectTimeWidget } from "./ios/project-time-widget";
import {
  fetchContributionGraphWidgetData,
  fetchPrayerWidgetData,
  fetchProjectTimeWidgetData,
} from "./widget-data";

/**
 * Every placed iOS widget shows the same un-configured default view the
 * Android widgets show before their configuration screen is used: all
 * trackers aggregated (contribution graph), all active projects summed
 * (project time), today's status (prayer, which is never configurable on
 * either platform). `expo-widgets` does support per-instance
 * `AppIntentConfiguration` pickers, but that needs a live list of
 * trackers/projects synced separately and kept fresh -- meaningfully more
 * surface area to get right unverified (no Xcode/Simulator in this
 * environment). Out of scope for this pass.
 */
async function syncContributionGraphWidget(): Promise<void> {
  const data = await fetchContributionGraphWidgetData({});
  contributionGraphWidget.updateSnapshot(data);
}

async function syncProjectTimeWidget(): Promise<void> {
  const data = await fetchProjectTimeWidgetData({});
  projectTimeWidget.updateSnapshot(data);
}

async function syncPrayerWidget(): Promise<void> {
  const data = await fetchPrayerWidgetData();
  prayerWidget.updateSnapshot(data);
}

/** Recomputes and re-pushes all three widgets' snapshots. No-op on non-iOS platforms. */
export async function syncAllIosWidgets(): Promise<void> {
  if (Platform.OS !== "ios") return;
  await Promise.all([
    syncContributionGraphWidget(),
    syncProjectTimeWidget(),
    syncPrayerWidget(),
  ]);
}

let pendingSync: Promise<void> | null = null;
let queuedAnotherRun = false;

/**
 * Debounced entry point for "something changed, the widgets might be
 * stale" call sites. Currently wired to app foreground/background
 * transitions (see `index.ts`); ideally also called right after
 * creating/editing/deleting an entry, once that's wired in (see the
 * report's "manual follow-up" note -- those call sites are in files this
 * task deliberately didn't touch). Collapses bursts of calls (e.g. saving
 * several fields in a row) into a single sync rather than one per call.
 */
export function notifyIosWidgetsDataChanged(): void {
  if (Platform.OS !== "ios") return;
  if (pendingSync) {
    queuedAnotherRun = true;
    return;
  }
  pendingSync = runSync();
}

async function runSync(): Promise<void> {
  do {
    queuedAnotherRun = false;
    try {
      await syncAllIosWidgets();
    } catch (error) {
      console.warn("[ios-sync] failed to sync widget data", error);
    }
  } while (queuedAnotherRun);
  pendingSync = null;
}
