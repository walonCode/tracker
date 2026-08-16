import { PrayerLogScreen } from "@/screens/prayer-log";

/**
 * Prayer log — formSheet modal route (see `_layout.tsx`), opened from
 * Today's checklist row and the Add modal's "Log Entry" list when the
 * `kind: "prayer"` tracker is selected. Real content lives in
 * `src/screens/prayer-log`; this route file is just the Expo Router entry
 * point per project convention (see `src/app/add.tsx`'s sibling comment).
 */
export default PrayerLogScreen;
