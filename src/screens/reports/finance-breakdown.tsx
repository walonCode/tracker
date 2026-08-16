import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { DOMAIN_PALETTE } from "@/theme/domain-palette";
import { useAppMaterialColors } from "@/theme/material-colors";
import type { Domain, EntryWithValues, Tracker, TrackerField } from "@/types";

import { ReportSection } from "./report-section";

export interface FinanceBreakdownProps {
  domains: Domain[];
  trackers: Tracker[];
  fieldsByTrackerId: Map<number, TrackerField[]>;
  /** Entries sliced to the selected range — drives the category breakdown. */
  entriesInRange: EntryWithValues[];
  /** Full history, unfiltered by range — drives the monthly-spend breakdown,
   * which is meant to show trend across many months regardless of whatever
   * week/month/all-time window is currently selected. */
  allEntries: EntryWithValues[];
  rangeLabel: string;
}

interface AmountFields {
  amountField: TrackerField | null;
  categoryField: TrackerField | null;
}

const UNCATEGORIZED = "Uncategorized";

/**
 * Resolves a Finance tracker's "amount" and "category" fields. Per the task
 * brief, "category" is not a schema column — it's a convention: the seeded
 * example (`seedSpendingTracker` in `src/db/seed.ts`) names its fields
 * exactly "amount" (number, unit "$") and "category" (text). Fields are
 * matched by `field.name`, never by guessed/hardcoded field ids. If a
 * user-created Finance tracker doesn't happen to use those exact names, this
 * falls back to "the first number-ish field" / "the first text field" so the
 * breakdown still has something reasonable to show instead of silently
 * omitting the tracker.
 */
function resolveAmountFields(fields: TrackerField[]): AmountFields {
  const amountField =
    fields.find((f) => f.name === "amount" && (f.type === "number" || f.type === "duration")) ??
    fields.find((f) => f.type === "number" || f.type === "duration") ??
    null;
  const categoryField =
    fields.find((f) => f.name === "category" && f.type === "text") ??
    fields.find((f) => f.type === "text") ??
    null;
  return { amountField, categoryField };
}

function sumByKey(
  entries: EntryWithValues[],
  financeTrackerIds: Set<number>,
  fieldsByTrackerId: Map<number, TrackerField[]>,
  keyFor: (entry: EntryWithValues) => string
): Map<string, number> {
  const totals = new Map<string, number>();
  const resolvedByTracker = new Map<number, AmountFields>();

  for (const entry of entries) {
    if (!financeTrackerIds.has(entry.trackerId)) continue;

    let resolved = resolvedByTracker.get(entry.trackerId);
    if (!resolved) {
      resolved = resolveAmountFields(fieldsByTrackerId.get(entry.trackerId) ?? []);
      resolvedByTracker.set(entry.trackerId, resolved);
    }
    if (!resolved.amountField) continue;

    const amount = entry.values.find((v) => v.fieldId === resolved!.amountField!.id)?.valueNumber;
    if (amount === null || amount === undefined) continue;

    const key = keyFor(entry);
    totals.set(key, (totals.get(key) ?? 0) + amount);
  }

  return totals;
}

function categoryKeyFactory(fieldsByTrackerId: Map<number, TrackerField[]>) {
  const resolvedByTracker = new Map<number, AmountFields>();
  return (entry: EntryWithValues): string => {
    let resolved = resolvedByTracker.get(entry.trackerId);
    if (!resolved) {
      resolved = resolveAmountFields(fieldsByTrackerId.get(entry.trackerId) ?? []);
      resolvedByTracker.set(entry.trackerId, resolved);
    }
    if (!resolved.categoryField) return UNCATEGORIZED;
    const text = entry.values.find((v) => v.fieldId === resolved!.categoryField!.id)?.valueText;
    return text && text.trim() !== "" ? text : UNCATEGORIZED;
  };
}

function formatAmount(value: number, unit: string | null): string {
  const rounded = Math.round(value * 100) / 100;
  return unit ? `${rounded} ${unit}` : String(rounded);
}

function sortedEntries(totals: Map<string, number>): [string, number][] {
  return Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
}

/**
 * Finance domain's dedicated breakdown — a category/spend view (grouped by
 * the entries' user-defined "category" text field, summed over the "amount"
 * number field) and a monthly-spend view — instead of the generic
 * `TrackerTrend` line charts every other domain gets. Renders in place of
 * (not in addition to) a Finance entry in `TrackerTrend`, per the brief.
 */
export function FinanceBreakdown({
  domains,
  trackers,
  fieldsByTrackerId,
  entriesInRange,
  allEntries,
  rangeLabel,
}: FinanceBreakdownProps) {
  const colors = useAppMaterialColors();
  const financeColor = DOMAIN_PALETTE.finance.color;

  const { categoryTotals, monthlyTotals, amountUnit } = useMemo(() => {
    const financeDomain = domains.find((d) => d.key === "finance");
    const financeTrackerIds = new Set(
      trackers.filter((t) => financeDomain && t.domainId === financeDomain.id).map((t) => t.id)
    );

    // Unit shown on every amount comes from the first resolved amount field
    // found — Finance trackers in this app conventionally share the same
    // "$" unit, and this avoids re-deriving/mixing units per row.
    let amountUnit: string | null = null;
    for (const trackerId of financeTrackerIds) {
      const resolved = resolveAmountFields(fieldsByTrackerId.get(trackerId) ?? []);
      if (resolved.amountField?.unit) {
        amountUnit = resolved.amountField.unit;
        break;
      }
    }

    const categoryKeyFor = categoryKeyFactory(fieldsByTrackerId);
    const categoryTotals = sortedEntries(
      sumByKey(entriesInRange, financeTrackerIds, fieldsByTrackerId, categoryKeyFor)
    );

    const monthlyTotals = sortedEntries(
      sumByKey(allEntries, financeTrackerIds, fieldsByTrackerId, (entry) =>
        entry.localDate.slice(0, 7)
      )
    ).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

    return { categoryTotals, monthlyTotals, amountUnit };
  }, [domains, trackers, fieldsByTrackerId, entriesInRange, allEntries]);

  const maxCategory = categoryTotals.reduce((max, [, v]) => Math.max(max, v), 0);
  const maxMonth = monthlyTotals.reduce((max, [, v]) => Math.max(max, v), 0);

  return (
    <ReportSection title="Finance">
      <Text style={[styles.subheading, { color: colors.onSurfaceVariant }]}>
        By category — {rangeLabel}
      </Text>
      {categoryTotals.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
          No spending logged in this range.
        </Text>
      ) : (
        categoryTotals.map(([category, total]) => (
          <View key={category} style={styles.barRow}>
            <View style={styles.barLabelRow}>
              <Text style={[styles.barLabel, { color: colors.onSurface }]}>{category}</Text>
              <Text style={[styles.barValue, { color: colors.onSurfaceVariant }]}>
                {formatAmount(total, amountUnit)}
              </Text>
            </View>
            <View style={[styles.barTrack, { backgroundColor: colors.surfaceContainerHigh }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: financeColor,
                    width: maxCategory > 0 ? `${(total / maxCategory) * 100}%` : "0%",
                  },
                ]}
              />
            </View>
          </View>
        ))
      )}

      <Text style={[styles.subheading, { color: colors.onSurfaceVariant, marginTop: 8 }]}>
        Monthly totals — all-time
      </Text>
      {monthlyTotals.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
          No spending logged yet.
        </Text>
      ) : (
        monthlyTotals.map(([month, total]) => (
          <View key={month} style={styles.barRow}>
            <View style={styles.barLabelRow}>
              <Text style={[styles.barLabel, { color: colors.onSurface }]}>{month}</Text>
              <Text style={[styles.barValue, { color: colors.onSurfaceVariant }]}>
                {formatAmount(total, amountUnit)}
              </Text>
            </View>
            <View style={[styles.barTrack, { backgroundColor: colors.surfaceContainerHigh }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: financeColor,
                    width: maxMonth > 0 ? `${(total / maxMonth) * 100}%` : "0%",
                  },
                ]}
              />
            </View>
          </View>
        ))
      )}
    </ReportSection>
  );
}

const styles = StyleSheet.create({
  subheading: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 13,
  },
  barRow: {
    gap: 4,
  },
  barLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  barLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  barValue: {
    fontSize: 12,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
});
