import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { computeStreaks, type StreakResult } from "@/lib/streaks";
import { DOMAIN_PALETTE } from "@/theme/domain-palette";
import { useAppMaterialColors } from "@/theme/material-colors";
import type { Domain, EntryWithValues, Tracker } from "@/types";

import { indexById } from "./lookups";
import { ReportSection } from "./report-section";

export interface StreakSummaryProps {
  domains: Domain[];
  trackers: Tracker[];
  /** Every entry ever recorded (unfiltered by the range selector) — a
   * streak inherently spans beyond whatever week/month window is selected,
   * so it's always computed over full history. */
  allEntries: EntryWithValues[];
}

interface DomainStreakRow {
  domain: Domain;
  streak: StreakResult;
}

interface TrackerStreakRow {
  tracker: Tracker;
  domain: Domain | null;
  streak: StreakResult;
}

/**
 * Current + longest streaks, per domain (any tracker in the domain logged
 * that day) and per tracker (that tracker specifically logged that day).
 * Gap math is delegated entirely to `computeStreaks` (`src/lib/streaks.ts`);
 * this component's only job is grouping each entry's `local_date` into the
 * right per-domain / per-tracker bucket before handing it off.
 */
export function StreakSummary({ domains, trackers, allEntries }: StreakSummaryProps) {
  const colors = useAppMaterialColors();

  const { domainRows, trackerRows } = useMemo(() => {
    const trackersById = indexById(trackers);
    const domainsById = indexById(domains);

    const datesByDomain = new Map<number, string[]>();
    const datesByTracker = new Map<number, string[]>();

    for (const entry of allEntries) {
      const tracker = trackersById.get(entry.trackerId);
      if (!tracker) continue;

      const trackerDates = datesByTracker.get(tracker.id);
      if (trackerDates) trackerDates.push(entry.localDate);
      else datesByTracker.set(tracker.id, [entry.localDate]);

      const domainDates = datesByDomain.get(tracker.domainId);
      if (domainDates) domainDates.push(entry.localDate);
      else datesByDomain.set(tracker.domainId, [entry.localDate]);
    }

    const domainRows: DomainStreakRow[] = domains.map((domain) => ({
      domain,
      streak: computeStreaks(datesByDomain.get(domain.id) ?? []),
    }));

    const trackerRows: TrackerStreakRow[] = trackers
      .filter((t) => !t.archivedAt && (datesByTracker.get(t.id)?.length ?? 0) > 0)
      .map((tracker) => ({
        tracker,
        domain: domainsById.get(tracker.domainId) ?? null,
        streak: computeStreaks(datesByTracker.get(tracker.id) ?? []),
      }))
      .sort((a, b) => {
        const domainA = a.domain?.sortOrder ?? 0;
        const domainB = b.domain?.sortOrder ?? 0;
        if (domainA !== domainB) return domainA - domainB;
        return a.tracker.sortOrder - b.tracker.sortOrder;
      });

    return { domainRows, trackerRows };
  }, [domains, trackers, allEntries]);

  return (
    <ReportSection title="Streaks">
      <Text style={[styles.subheading, { color: colors.onSurfaceVariant }]}>By domain</Text>
      {domainRows.map(({ domain, streak }) => (
        <View key={domain.id} style={[styles.row, { borderColor: colors.outlineVariant }]}>
          <View
            style={[
              styles.dot,
              { backgroundColor: DOMAIN_PALETTE[domain.key]?.color ?? colors.outline },
            ]}
          />
          <Text style={[styles.label, { color: colors.onSurface }]}>{domain.label}</Text>
          <Text style={[styles.stats, { color: colors.onSurfaceVariant }]}>
            {streak.current} current · {streak.longest} longest
          </Text>
        </View>
      ))}

      <Text style={[styles.subheading, { color: colors.onSurfaceVariant, marginTop: 8 }]}>
        By tracker
      </Text>
      {trackerRows.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
          No tracker has any entries yet.
        </Text>
      ) : (
        trackerRows.map(({ tracker, domain, streak }) => (
          <View key={tracker.id} style={[styles.row, { borderColor: colors.outlineVariant }]}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: domain ? DOMAIN_PALETTE[domain.key]?.color : colors.outline,
                },
              ]}
            />
            <Text style={[styles.label, { color: colors.onSurface }]}>{tracker.name}</Text>
            <Text style={[styles.stats, { color: colors.onSurfaceVariant }]}>
              {streak.current} current · {streak.longest} longest
            </Text>
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
  emptyText: {
    fontSize: 13,
  },
});
