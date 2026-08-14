import { Redirect } from "expo-router";

/**
 * Entry route. Immediately hands off to the tab shell's default tab
 * (Today, at `(tabs)/index.tsx`). Kept as its own file (rather than making
 * `(tabs)` the root layout) so a later phase can insert a gate here (e.g.
 * onboarding/auth) without restructuring the tab group.
 *
 * Replaces the Phase 0 smoke-test content (SQLite/Skia/Compose probes) now
 * that Phase 2 introduces the real navigation shell.
 */
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
