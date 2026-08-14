import { Tabs } from "expo-router/js-tabs";

import TabBar from "@/components/tab-bar";

/**
 * The tab shell: Today | History | Reports, rendered through a fully custom
 * `tabBar` (see `src/components/tab-bar`) so we get genuine Material 3
 * chrome (via `@expo/ui/jetpack-compose` on Android) with a floating "+"
 * that is never a registered tab route — it lives only inside the custom
 * tab bar component and calls `router.push('/add')` directly.
 *
 * `expo-router/js-tabs` is the current (SDK 57) import path for the classic
 * React Navigation bottom-tabs-based `Tabs` that supports a custom `tabBar`
 * render prop — the root `expo-router` package's `Tabs` re-export is
 * deprecated in favor of this path, and `NativeTabs` (the other option)
 * doesn't support injecting a non-route FAB into its tab bar.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Today" }} />
      <Tabs.Screen name="history" options={{ title: "History" }} />
      <Tabs.Screen name="reports" options={{ title: "Reports" }} />
    </Tabs>
  );
}
