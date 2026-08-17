import { Stack } from "expo-router";
import { useEffect } from "react";

import { getDb } from "@/db/client";
import { ensureSeeded } from "@/db/seed-once";

/**
 * Root stack: the tab shell as one screen, plus the two formSheet modal
 * routes (`add`, `prayer-log`) that live above it. The tab shell itself
 * (Today / History / Reports + the floating "+") is defined in
 * `(tabs)/_layout.tsx`.
 */
export default function RootLayout() {
  useEffect(() => {
    // Fire-and-forget: `ensureSeeded` is idempotent and memoizes its own
    // in-flight promise, so this just guarantees seeding starts as early as
    // possible on every foreground launch rather than waiting on whichever
    // screen happens to mount first. No setState here — each screen's own
    // hooks still await `ensureSeeded` themselves before reading data.
    getDb().then(ensureSeeded);
  }, []);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
