import { router, Stack } from "expo-router";
import { useEffect } from "react";

import { getDb } from "@/db/client";
import { getAppMeta } from "@/db/repositories";
import { ONBOARDING_COMPLETE_KEY } from "@/screens/onboarding";
import { ensureSeeded } from "@/db/seed-once";

/**
 * Root stack: the tab shell as one screen, plus the `onboarding` screen and
 * the two formSheet modal routes (`add`, `prayer-log`) that live above it.
 * The tab shell itself (Today / Insights + the floating "Create" FAB) is
 * defined in `(tabs)/_layout.tsx`.
 *
 * On a fresh install (or any launch before `app_meta['onboarding_completed']`
 * is set — see `src/db/repositories/app-meta.ts`), the effect below
 * imperatively `router.replace`s to `/onboarding` once that check resolves.
 * This is deliberately NOT done via a conditional `<Stack.Screen>` list or
 * `Stack.Protected`: both require the Stack/NavigationContainer to already
 * be settled before a guard change is a reliable redirect trigger, and
 * gating the Stack's own first mount behind the same async check (as an
 * earlier version of this file did) collides with that — it produced a
 * "state update on a component that hasn't mounted yet" warning and landed
 * on a blank, unstyled fallback screen instead of onboarding. Mounting the
 * Stack immediately and redirecting imperatively afterward is the
 * consistently reliable version of this pattern; the tab shell's normal
 * loading states (each screen already shows its own spinner while its data
 * hook resolves) cover the brief moment before the redirect fires.
 */
export default function RootLayout() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const db = await getDb();
      await ensureSeeded(db);
      const completed = await getAppMeta(db, ONBOARDING_COMPLETE_KEY);
      if (cancelled) return;
      if (completed !== "true") {
        router.replace("/onboarding");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="onboarding"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="add"
        options={{
          presentation: "formSheet",
          title: "Add",
          sheetAllowedDetents: [0.5, 1],
          sheetGrabberVisible: true,
        }}
      />
      <Stack.Screen
        name="prayer-log"
        options={{
          presentation: "formSheet",
          title: "Prayer Log",
          sheetAllowedDetents: [0.5, 1],
          sheetGrabberVisible: true,
        }}
      />
    </Stack>
  );
}
