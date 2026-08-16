import WidgetConfigScreen from "@/screens/widget-config";

/**
 * Widget configuration screen — registered directly with
 * `registerWidgetConfigurationScreen` from the root `index.js`, not reached
 * through Expo Router's navigator (Android's `RNWidgetConfigurationActivity`
 * loads it as its own root component). Lives under `src/app/` anyway per
 * this repo's route-file convention (see `src/app/add.tsx` / `prayer-log.tsx`
 * siblings); real content lives in `src/screens/widget-config`.
 */
export default WidgetConfigScreen;
