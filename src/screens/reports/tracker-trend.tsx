import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { TrendChart, type TrendChartPoint } from "@/components/trend-chart";
import { DOMAIN_PALETTE } from "@/theme/domain-palette";
import { useAppMaterialColors } from "@/theme/material-colors";
import type { Domain, EntryWithValues, FieldType, Tracker, TrackerField } from "@/types";

import { domainKeyForTracker, indexById } from "./lookups";
import { ReportSection } from "./report-section";

export interface TrackerTrendProps {
  domains: Domain[];
  trackers: Tracker[];
  fieldsByTrackerId: Map<number, TrackerField[]>;
  /** Entries already sliced to the selected range (week/month/all-time). */
  entries: EntryWithValues[];
  rangeLabel: string;
}

const NUMERIC_FIELD_TYPES: readonly FieldType[] = ["number", "duration", "scale"];

interface TrendSeries {
  tracker: Tracker;
  field: TrackerField;
  color: string;
  points: TrendChartPoint[];
}

/**
 * Per-tracker trend lines for the selected range: one Skia line chart per
 * generic (non-Finance, non-project-time) tracker that has at least one
 * numeric-ish field. Finance trackers are excluded here because they get
 * `finance-breakdown.tsx`'s category/spend view instead, and `project_time`
 * trackers are excluded because they get `project-time-summary.tsx`'s view —
 * per the brief, those two domains/kinds render domain-specific views
 * instead of generic trends. The prayer tracker is excluded implicitly (not
 * by kind check): its 10 fields are all `type: "boolean"`, so it never has a
 * numeric field to plot in the first place.
 *
 * When a tracker has more than one numeric-ish field, only the first (by
 * `sortOrder`) is plotted — one line per tracker keeps this section
 * scannable; a future iteration could add a per-field picker.
 */
export function TrackerTrend({
  domains,
  trackers,
  fieldsByTrackerId,
  entries,
  rangeLabel,
}: TrackerTrendProps) {
  const colors = useAppMaterialColors();

  const series = useMemo<TrendSeries[]>(() => {
    const domainsById = indexById(domains);
    const trackersById = indexById(trackers);

    const eligible = trackers
      .filter((t) => !t.archivedAt && t.kind !== "project_time")
      .filter((t) => domainKeyForTracker(t.id, trackersById, domainsById) !== "finance")
      .map((tracker) => {
        const fields = fieldsByTrackerId.get(tracker.id) ?? [];
        const field = fields.find((f) => NUMERIC_FIELD_TYPES.includes(f.type));
        return field ? { tracker, field } : null;
      })
      .filter((entry): entry is { tracker: Tracker; field: TrackerField } => entry !== null)
      .sort((a, b) => {
        const domainA = domainsById.get(a.tracker.domainId)?.sortOrder ?? 0;
        const domainB = domainsById.get(b.tracker.domainId)?.sortOrder ?? 0;
        if (domainA !== domainB) return domainA - domainB;
        return a.tracker.sortOrder - b.tracker.sortOrder;
      });

    return eligible.map(({ tracker, field }) => {
      const byDate = new Map<string, number>();
      for (const entry of entries) {
        if (entry.trackerId !== tracker.id) continue;
        const value = entry.values.find((v) => v.fieldId === field.id)?.valueNumber;
        if (value === null || value === undefined) continue;
        byDate.set(entry.localDate, (byDate.get(entry.localDate) ?? 0) + value);
      }

      const domainKey = domainsById.get(tracker.domainId)?.key;
      const color = domainKey ? DOMAIN_PALETTE[domainKey].color : colors.primary;
      const points: TrendChartPoint[] = Array.from(byDate.entries())
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

      return { tracker, field, color, points };
    });
  }, [domains, trackers, fieldsByTrackerId, entries, colors.primary]);

  return (
    <ReportSection title={`Trends — ${rangeLabel}`}>
      {series.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
          No numeric trackers to chart yet.
        </Text>
      ) : (
        series.map(({ tracker, field, color, points }) => (
          <View key={tracker.id} style={[styles.card, { borderColor: colors.outlineVariant }]}>
            <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
              {tracker.name}
              {field.label !== tracker.name ? ` · ${field.label}` : ""}
            </Text>
            <TrendChart data={points} color={color} unit={field.unit} labelColor={colors.onSurfaceVariant} />
          </View>
        ))
      )}
    </ReportSection>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 6,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 13,
  },
});
