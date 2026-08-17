import { Checkbox, ListItem, Text } from "@expo/ui";
import { router } from "expo-router";

import type { PrayerProgress } from "@/hooks/use-daily-checklist";
import { DOMAIN_PALETTE } from "@/theme/domain-palette";
import type { Domain, Tracker, TrackerField } from "@/types";

const FALLBACK_DOMAIN_COLOR = DOMAIN_PALETTE.religion.color;

export interface ChecklistRowProps {
  tracker: Tracker;
  domain: Domain | undefined;
  fields: TrackerField[];
  checked: boolean;
  /** Fard/sunnah split, `kind: "prayer"` rows only — see `PrayerProgress`. */
  progress: PrayerProgress | null;
  onToggle: () => void;
}

/**
 * One row of the fixed daily checklist. Rendered as a `ListItem` — this
 * component intentionally does NOT wrap itself in its own `<Host>`: the
 * parent screen (`index.tsx`) hosts a single `Host` + `Column` for the whole
 * checklist so every row shares one native bridge instead of paying the
 * Host-per-row cost (same pattern as `src/components/tab-bar`, just spread
 * across component-file boundaries — Host doesn't care where in the React
 * tree its descendants are defined).
 *
 * `Checkbox`/`ListItem`/`Text` here are the *universal* `@expo/ui` exports
 * (verified via `list-components.js` — see task-5-report.md), each already
 * platform-split internally (SwiftUI on iOS, Jetpack Compose on Android,
 * plain View/Text fallback elsewhere) so this file needs no `.android.tsx`
 * split of its own.
 *
 * The `kind: "prayer"` tracker is special-cased per the brief: instead of an
 * inline checkbox it shows a fard/sunnah split progress readout (e.g.
 * "4/5 fard, 3/5 sunnah" — a combined 10-field count would hide which half
 * is behind) and routes to `/prayer-log` on tap (that screen owns actually
 * recording fard/sunnah completion — out of scope here, see the
 * `src/screens/prayer-log` sibling).
 *
 * A tracker with any non-boolean field (a number, duration, text, or scale
 * value to fill in) can't be safely instant-toggled the way a plain
 * boolean-only tracker can — there's no value to record. Checking such a row
 * while it's unchecked routes to the full log-entry form (`/add?trackerId=`)
 * instead of calling `onToggle`, which would otherwise silently create an
 * entry with none of its values set. Unchecking (removing today's entry) has
 * no such ambiguity and always calls `onToggle` directly.
 */
export function ChecklistRow({
  tracker,
  domain,
  fields,
  checked,
  progress,
  onToggle,
}: ChecklistRowProps) {
  const supportingText = domain?.label;

  if (tracker.kind === "prayer") {
    const progressLabel = progress
      ? `${progress.fard.done}/${progress.fard.total} fard, ${progress.sunnah.done}/${progress.sunnah.total} sunnah`
      : undefined;
    const progressColor = domain ? DOMAIN_PALETTE[domain.key].color : FALLBACK_DOMAIN_COLOR;
    return (
      <ListItem
        onPress={() => router.push("/prayer-log")}
        supportingText={supportingText}
        trailing={
          progressLabel ? (
            <Text textStyle={{ color: progressColor }}>{progressLabel}</Text>
          ) : undefined
        }
      >
        {tracker.name}
      </ListItem>
    );
  }

  const needsForm = !checked && fields.some((f) => f.type !== "boolean");
  const handlePress = () => {
    if (needsForm) {
      router.push({ pathname: "/add", params: { trackerId: String(tracker.id) } });
    } else {
      onToggle();
    }
  };

  return (
    <ListItem
      onPress={handlePress}
      leading={<Checkbox value={checked} onValueChange={handlePress} />}
      supportingText={supportingText}
    >
      {tracker.name}
    </ListItem>
  );
}
