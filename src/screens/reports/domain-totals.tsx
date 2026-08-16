import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { DOMAIN_PALETTE } from "@/theme/domain-palette";
import { useAppMaterialColors } from "@/theme/material-colors";
import type { Domain, EntryWithValues, Tracker } from "@/types";

import { indexById } from "./lookups";
import { ReportSection } from "./report-section";

export interface DomainTotalsProps {
  domains: Domain[];
  trackers: Tracker[];
  /** Entries already sliced to the selected range (week/month/all-time). */
  entries: EntryWithValues[];
  /** Label for the currently selected range, e.g. "this week". */
  rangeLabel: string;
}

interface DomainTotal {
  domain: Domain;
  entryCount: number;
  trackerCount: number;
  activeDays: number;
}

/**
 * Per-domain totals for the selected range: how many entries were logged,
 * across how many distinct trackers, on how many distinct days. Domain
 * membership is resolved via each entry's *tracker's* `domainId` (an entry
 * has no domain of its own) — same join `use-history.ts` does.
 */
export function DomainTotals({ domains, trackers, entries, rangeLabel }: DomainTotalsProps) {
  const colors = useAppMaterialColors();

  const totals = useMemo<DomainTotal[]>(() => {
    const trackersById = indexById(trackers);
    const byDomainId = new Map<
      number,
      { entryCount: number; trackerIds: Set<number>; days: Set<string> }
    >();

    for (const entry of entries) {
      const tracker = trackersById.get(entry.trackerId);
      if (!tracker) continue;
      let bucket = byDomainId.get(tracker.domainId);
      if (!bucket) {
        bucket = { entryCount: 0, trackerIds: new Set(), days: new Set() };
        byDomainId.set(tracker.domainId, bucket);
      }
      bucket.entryCount += 1;
      bucket.trackerIds.add(tracker.id);
      bucket.days.add(entry.localDate);
    }

    return domains.map((domain) => {
      const bucket = byDomainId.get(domain.id);
      return {
        domain,
        entryCount: bucket?.entryCount ?? 0,
        trackerCount: bucket?.trackerIds.size ?? 0,
        activeDays: bucket?.days.size ?? 0,
      };
    });
  }, [domains, trackers, entries]);

  return (
    <ReportSection title={`Domain totals — ${rangeLabel}`}>
      {totals.map(({ domain, entryCount, trackerCount, activeDays }) => (
        <View
          key={domain.id}
          style={[styles.row, { borderColor: colors.outlineVariant }]}
        >
          <View
            style={[
              styles.dot,
              { backgroundColor: DOMAIN_PALETTE[domain.key]?.color ?? colors.outline },
            ]}
          />
          <Text style={[styles.label, { color: colors.onSurface }]}>{domain.label}</Text>
          <Text style={[styles.stats, { color: colors.onSurfaceVariant }]}>
            {entryCount} {entryCount === 1 ? "entry" : "entries"} · {trackerCount}{" "}
            {trackerCount === 1 ? "tracker" : "trackers"} · {activeDays}{" "}
            {activeDays === 1 ? "day" : "days"}
          </Text>
        </View>
      ))}
    </ReportSection>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  stats: {
    fontSize: 12,
  },
});
