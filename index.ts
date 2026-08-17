// Root entry point. Expo Router apps normally point `package.json#main`
// straight at `expo-router/entry`, but `react-native-android-widget` needs a
// process-level `registerWidgetTaskHandler`/`registerWidgetConfigurationScreen`
// call made once, outside of any React component tree — there's no other
// hook for that in a router-only entry file. Per the package's current docs
// (https://saleksovski.github.io/react-native-android-widget/docs/tutorial/register-task-handler,
// "Register widget task handler (Expo + Expo Router)" section, checked
// 2026-08-16 against v0.22.0), the fix is exactly this: keep
// `expo-router/entry`'s side effect (it self-registers the root component,
// same as `registerRootComponent` would) and register the widget handlers
// next to it in a custom entry file that `package.json#main` now points to
// instead.
import "expo-router/entry";

import { AppState, Platform } from "react-native";
import {
  registerWidgetConfigurationScreen,
  registerWidgetTaskHandler,
} from "react-native-android-widget";

import WidgetConfigScreen from "./src/app/widget-config";
import { syncAllIosWidgets } from "./src/widgets/ios-sync";
import { widgetTaskHandler } from "./src/widgets/widget-task-handler";

registerWidgetTaskHandler(widgetTaskHandler);
registerWidgetConfigurationScreen(WidgetConfigScreen);

// iOS has no equivalent of the headless task handler above — a WidgetKit
// `TimelineProvider` runs in its own extension process and can't be handed
// a JS render function (see `src/widgets/ios-sync.ts` for the full
// rationale). Instead we push a JSON snapshot into the shared App Group
// container at the moments the user is most likely about to look at their
// home screen — app launch and every foreground/background transition —
// and WidgetKit reloads from that snapshot. `syncAllIosWidgets` itself is a
// no-op on non-iOS platforms, but the `AppState` listener is skipped
// entirely on Android/web to avoid the extra subscription for no reason.
if (Platform.OS === "ios") {
  syncAllIosWidgets().catch((error) => {
    console.warn("[ios-sync] initial sync failed", error);
  });

  AppState.addEventListener("change", (state) => {
    if (state === "active" || state === "background") {
      syncAllIosWidgets().catch((error) => {
        console.warn("[ios-sync] AppState sync failed", error);
      });
    }
  });
}
