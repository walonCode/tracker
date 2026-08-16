import { StyleSheet, Text, View } from "react-native";

import type { HistoryEntryItem } from "@/hooks/use-history";
import { DOMAIN_PALETTE } from "@/theme/domain-palette";
import { useAppMaterialColors } from "@/theme/material-colors";
import type { EntryValue, EntryWithValues, TrackerField } from "@/types";

/** Renders one field value as "Label: value[ unit]", or "" to skip it (empty text fields). */
function formatEntryValue(value: EntryValue & { field: TrackerField }): string {
  const { field } = value;
  switch (field.type) {
    case "boolean":
      return value.valueBoolean === null
        ? ""
        : `${field.label}: ${value.valueBoolean ? "Yes" : "No"}`;
    case "text":
      return value.valueText ? `${field.label}: ${value.valueText}` : "";
    case "scale": {
      if (value.valueNumber === null) return "";
      const max = field.config?.max;
      return max
        ? `${field.label}: ${value.valueNumber}/${max}`
        : `${field.label}: ${value.valueNumber}`;
    }
    case "number":
    case "duration": {
      if (value.valueNumber === null) return "";
      const unit = field.unit ? ` ${field.unit}` : "";
      return `${field.label}: ${value.valueNumber}${unit}`;
    }
    default:
      return "";
  }
}

/**
 * The prayer tracker always has exactly 5 daily prayers (see
 * `src/db/seed.ts`'s `PRAYERS` array), each contributing one fard field and
 * one sunnah field. This is hardcoded rather than derived from
 * `entry.values.length` because unchecked toggles are omitted from
 * `entry_values` entirely (see `src/screens/prayer-log/index.tsx`), so the
 * "total" half of "x/5" can't be recovered from the entry's own value rows.
 */
const PRAYER_COUNT = 5;

/**
 * Compact "x/5 fard, y/5 sunnah" summary for a `kind: "prayer"` entry,
 * replacing what would otherwise be a 10-line dump of "Fajr (Fard): Yes" /
 * "Fajr (Fard): No" rows (one per boolean field) via `formatEntryValue`.
 * Field association is via the stable `name` suffix (`_fard` / `_sunnah`,
 * see `src/db/seed.ts`), never the `label`.
 */
function formatPrayerSummary(entry: EntryWithValues): string {
  const fardDone = entry.values.filter(
    (v) => v.field.name.endsWith("_fard") && v.valueBoolean === true
  ).length;
  const sunnahDone = entry.values.filter(
    (v) => v.field.name.endsWith("_sunnah") && v.valueBoolean === true
  ).length;
  return `${fardDone}/${PRAYER_COUNT} fard, ${sunnahDone}/${PRAYER_COUNT} sunnah`;
}

export interface EntryRowProps {
  item: HistoryEntryItem;
}

/**
 * One entry row: tracker name, color-coded domain tag, field values, note.
 * `kind: "prayer"` entries (detected via the joined `tracker.kind`, per
 * `HistoryEntryItem`) render a compact fard/sunnah summary instead of the
 * generic per-field dump — 10 separate "Fajr (Fard): Yes" lines would be
 * noisy for a fixed 10-boolean-field tracker. Falls back to the generic dump
 * if the tracker was hard-deleted (`tracker` is `null`, `kind` unknown).
 */
export function EntryRow({ item }: EntryRowProps) {
  const colors = useAppMaterialColors();
  const { entry, tracker, domain } = item;
  const domainColor = domain ? DOMAIN_PALETTE[domain.key].color : colors.outline;
  const trackerName = tracker?.name ?? "Deleted tracker";

  const valueLine =
    tracker?.kind === "prayer"
      ? formatPrayerSummary(entry)
      : entry.values
          .map(formatEntryValue)
          .filter((line) => line.length > 0)
          .join("   ·   ");

  return (
    <View style={[styles.row, { borderBottomColor: colors.outlineVariant }]}>
      <View style={styles.header}>
        <View style={[styles.domainDot, { backgroundColor: domainColor }]} />
        <Text
          style={[styles.trackerName, { color: colors.onSurface }]}
          numberOfLines={1}
        >
          {trackerName}
        </Text>
        {domain ? (
          <View style={[styles.domainTag, { backgroundColor: `${domainColor}26` }]}>
            <Text style={[styles.domainTagText, { color: domainColor }]}>
              {domain.label}
            </Text>
          </View>
        ) : null}
      </View>
      {valueLine ? (
        <Text style={[styles.values, { color: colors.onSurfaceVariant }]}>
          {valueLine}
        </Text>
      ) : null}
      {entry.note ? (
        <Text style={[styles.note, { color: colors.onSurfaceVariant }]}>
          {entry.note}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  domainDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  trackerName: {
    fontSize: 15,
    fontWeight: "600",
    flexShrink: 1,
  },
  domainTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  domainTagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  values: {
    fontSize: 13,
  },
  note: {
    fontSize: 13,
    fontStyle: "italic",
  },
});
