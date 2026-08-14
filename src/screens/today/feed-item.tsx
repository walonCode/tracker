import { StyleSheet, Text, View } from "react-native";

import { useAppMaterialColors } from "@/theme/material-colors";
import { DOMAIN_PALETTE } from "@/theme/domain-palette";
import type { Domain, EntryWithValues, Tracker } from "@/types";

export interface FeedItemProps {
  entry: EntryWithValues;
  tracker: Tracker | undefined;
  domain: Domain | undefined;
}

function formatTime(occurredAt: string): string {
  const date = new Date(occurredAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/**
 * Renders an entry's values as a compact " · "-joined summary line, e.g.
 * "Fajr (Fard) · Amount: 1500 ml". Boolean fields only render when true
 * (this phase never writes an explicit `false`, see `use-daily-checklist`'s
 * toggle-off = delete-the-entry behavior) so a field's mere presence in the
 * summary already means "done".
 */
function formatValues(entry: EntryWithValues): string {
  const parts: string[] = [];
  for (const value of entry.values) {
    const { field } = value;
    if (value.valueBoolean === true) {
      parts.push(field.label);
    } else if (value.valueNumber !== null) {
      parts.push(`${field.label}: ${value.valueNumber}${field.unit ? ` ${field.unit}` : ""}`);
    } else if (value.valueText !== null) {
      parts.push(`${field.label}: ${value.valueText}`);
    }
  }
  return parts.join(" · ");
}

/** One row of the "everything logged today" activity feed. Plain RN — no @expo/ui shape fits a free-form summary line + timestamp well here. */
export function FeedItem({ entry, tracker, domain }: FeedItemProps) {
  const colors = useAppMaterialColors();
  const time = formatTime(entry.occurredAt);
  const summary = formatValues(entry);
  const domainColor = domain ? DOMAIN_PALETTE[domain.key].color : colors.outline;

  return (
    <View style={[styles.row, { borderColor: colors.outlineVariant }]}>
      <View style={[styles.dot, { backgroundColor: domainColor }]} />
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.onSurface }]}>
          {tracker?.name ?? "Unknown tracker"}
        </Text>
        {summary ? (
          <Text style={[styles.summary, { color: colors.onSurfaceVariant }]}>{summary}</Text>
        ) : null}
        {entry.note ? (
          <Text style={[styles.summary, { color: colors.onSurfaceVariant }]} numberOfLines={2}>
            {entry.note}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.time, { color: colors.onSurfaceVariant }]}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
  },
  summary: {
    fontSize: 13,
  },
  time: {
    fontSize: 12,
    marginTop: 2,
  },
});
