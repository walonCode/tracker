/**
 * iOS-only widget data sync: serializes the current data for each of the
 * three WidgetKit widgets (mirroring `./widget-data.ts`'s Android fetchers
 * exactly) into the shared App Group container, then asks WidgetKit to
 * reload. See `ios-widgets/widget/` for the SwiftUI side that reads these
 * snapshots.
 *
 * Unlike Android's `registerWidgetTaskHandler` (a headless JS task the OS
 * invokes directly, see `./widget-task-handler.tsx`), a WidgetKit
 * `TimelineProvider` runs entirely inside a separate native extension
 * process that can't execute JS or open this app's SQLite database --
 * there's no "headless JS" equivalent on iOS. The standard pattern instead
 * (see https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date
 * and the `@bacons/apple-targets` App Groups guide, both checked
 * 2026-08-17) is for the *main app* to push a small JSON snapshot into a
 * shared `UserDefaults(suiteName:)` container whenever relevant data
 * changes, and for the widget extension to just read that snapshot -- so
 * this module's job is exactly that push, not a live query.
 */
import { ExtensionStorage } from "@bacons/apple-targets";
import { Platform } from "react-native";

import {
  fetchContributionGraphWidgetData,
  fetchPrayerWidgetData,
  fetchProjectTimeWidgetData,
} from "./widget-data";

/**
 * Must exactly match `ios.entitlements["com.apple.security.application-groups"]`
 * in app.json and `appGroupIdentifier` in
 * `ios-widgets/widget/SharedModels.swift`. A typo here doesn't fail loudly
 * -- it silently creates a second, unshared `UserDefaults` suite (see the
 * App Groups entitlement gotchas), so the widgets would just keep showing
 * their placeholder data forever.
 */
export const IOS_APP_GROUP = "group.com.walonfoundation.tracker";

const CONTRIBUTION_GRAPH_KEY = "contribution_graph_widget_data";
const PROJECT_TIME_KEY = "project_time_widget_data";
const PRAYER_KEY = "prayer_widget_data";

const storage = new ExtensionStorage(IOS_APP_GROUP);

/**
 * Writes one widget kind's current data as a JSON string, read back via
 * `WidgetSnapshotKey`-keyed `UserDefaults` lookups + `JSONDecoder` in
 * `ios-widgets/widget/SharedModels.swift`'s `loadWidgetSnapshot`. Uses
 * `ExtensionStorage#set` with a `string` value deliberately, not its
 * object/array overloads -- those only bridge a flat
 * `Record<string, string | number>` shape (see the package's native
 * `setObject`/`setArray` methods), which can't represent the contribution
 * graph's nested `grid: ContributionGridCell[][]`. A plain JSON string has
 * no such shape restriction and keeps this module a straightforward mirror
 * of `./widget-data.ts`'s return types.
 */
function writeSnapshot(key: string, value: unknown): void {
  storage.set(key, JSON.stringify(value));
}

/**
 * Every placed iOS widget shows the same un-configured default view the
 * Android widgets show before their configuration screen is used: all
 * trackers aggregated (contribution graph), all active projects summed
 * (project time), today's status (prayer, which is never configurable on
 * either platform). WidgetKit *can* support per-instance user configuration
 * via `AppIntentConfiguration` + a parameter picker, but that picker would
 * itself need a live list of trackers/projects synced into the shared
 * container and kept fresh -- meaningfully more surface area to get right
 * unverified (no Xcode/Simulator in this environment). Out of scope for
 * this pass; see the report for how to add it later.
 */
async function syncContributionGraphWidget(): Promise<void> {
  const data = await fetchContributionGraphWidgetData({});
  writeSnapshot(CONTRIBUTION_GRAPH_KEY, data);
}

async function syncProjectTimeWidget(): Promise<void> {
  const data = await fetchProjectTimeWidgetData({});
  writeSnapshot(PROJECT_TIME_KEY, data);
}

async function syncPrayerWidget(): Promise<void> {
  const data = await fetchPrayerWidgetData();
  writeSnapshot(PRAYER_KEY, data);
}

/**
 * Recomputes and re-pushes all three widgets' snapshots, then asks
 * WidgetKit to reload every placed widget from this extension
 * (`ExtensionStorage.reloadWidget()` -> `WidgetCenter.shared.reloadAllTimelines()`
 * on the native side, per the package's `ExtensionStorage` source). No-op
 * on non-iOS platforms, and safe to call in Expo Go / any build without the
 * native module linked -- `ExtensionStorage`'s own JS bridge falls back to
 * no-op stubs when `expo.modules.ExtensionStorage` isn't present, so this
 * never throws for that reason.
 */
export async function syncAllIosWidgets(): Promise<void> {
  if (Platform.OS !== "ios") return;
  await Promise.all([
    syncContributionGraphWidget(),
    syncProjectTimeWidget(),
    syncPrayerWidget(),
  ]);
  ExtensionStorage.reloadWidget();
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
 * several fields in a row) into a single sync + reload rather than one per
 * call.
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
