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
// next to it in a custom `index.js` that `package.json#main` now points to
// instead.
import "expo-router/entry";

import {
  registerWidgetConfigurationScreen,
  registerWidgetTaskHandler,
} from "react-native-android-widget";

import WidgetConfigScreen from "./src/app/widget-config";
import { widgetTaskHandler } from "./src/widgets/widget-task-handler";

registerWidgetTaskHandler(widgetTaskHandler);
registerWidgetConfigurationScreen(WidgetConfigScreen);
