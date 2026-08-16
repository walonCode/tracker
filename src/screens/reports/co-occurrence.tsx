import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { DOMAIN_PALETTE } from "@/theme/domain-palette";
import { useAppMaterialColors } from "@/theme/material-colors";
import type { Domain, EntryWithValues, Tracker } from "@/types";

import { indexById } from "./lookups";
import { ReportSection } from "./report-section";

export interface CoOccurrenceProps {
  domains: Domain[];
  trackers: Tracker[];
  /** Entries already sliced to the selected range — co-occurrence is always
   * measured within whatever range the user has selected. */
  entries: EntryWithValues[];
  rangeLabel: string;
}

/**
 * Generic cross-domain co-occurrence query: pick any two trackers (from any
 * domain, not just the same one) and see how often they were both logged on
 * the same local day within the selected range. Nothing here is specific to
 * any tracker kind/domain — it's a pure day-set intersection over whichever
 * two trackers the user picks, which is what makes it "cross-domain": e.g.
 * "how often did I log spending on days I also worked out."
 */
export function CoOccurrence({ domains, trackers, entries, rangeLabel }: CoOccurrenceProps) {
  const colors = useAppMaterialColors();
  const domainsById = useMemo(() => indexById(domains), [domains]);

  const selectable = useMemo(
    () =>
      trackers
        .filter((t) => !t.archivedAt)
        .sort((a, b) => {
          const domainA = domainsById.get(a.domainId)?.sortOrder ?? 0;
          const domainB = domainsById.get(b.domainId)?.sortOrder ?? 0;
          if (domainA !== domainB) return domainA - domainB;
          return a.sortOrder - b.sortOrder;
        }),
    [trackers, domainsById]
  );

  // No user pick yet (or the picked tracker no longer exists in `selectable`,
  // e.g. it got archived) falls back to the first two distinct trackers —
  // computed directly during render rather than synced via a `useEffect` +
  // `setState`, so there's no extra render pass and no risk of the effect
  // firing after `selectable` legitimately becomes empty.
  const [trackerAId, setTrackerAId] = useState<number | null>(null);
  const [trackerBId, setTrackerBId] = useState<number | null>(null);

  const effectiveAId =
    trackerAId !== null && selectable.some((t) => t.id === trackerAId)
      ? trackerAId
      : (selectable[0]?.id ?? null);
  const effectiveBId =
    trackerBId !== null && selectable.some((t) => t.id === trackerBId)
      ? trackerBId
      : (selectable.find((t) => t.id !== effectiveAId)?.id ?? selectable[0]?.id ?? null);

  const trackerA = selectable.find((t) => t.id === effectiveAId) ?? null;
  const trackerB = selectable.find((t) => t.id === effectiveBId) ?? null;

  const result = useMemo(() => {
    if (!trackerA || !trackerB) return null;

    const daysA = new Set<string>();
    const daysB = new Set<string>();
    for (const entry of entries) {
      if (entry.trackerId === trackerA.id) daysA.add(entry.localDate);
      if (entry.trackerId === trackerB.id) daysB.add(entry.localDate);
    }

    let both = 0;
    for (const day of daysA) if (daysB.has(day)) both += 1;

    return {
      both,
      onlyA: daysA.size - both,
      onlyB: daysB.size - both,
      daysA: daysA.size,
      daysB: daysB.size,
    };
  }, [trackerA, trackerB, entries]);

  return (
    <ReportSection title={`Co-occurrence — ${rangeLabel}`}>
      <TrackerPicker
        label="Tracker A"
        trackers={selectable}
        domainsById={domainsById}
        selectedId={effectiveAId}
        onSelect={setTrackerAId}
      />
      <TrackerPicker
        label="Tracker B"
        trackers={selectable}
        domainsById={domainsById}
        selectedId={effectiveBId}
        onSelect={setTrackerBId}
      />

      {!trackerA || !trackerB ? (
        <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
          Not enough trackers yet to compare.
        </Text>
      ) : trackerA.id === trackerB.id ? (
        <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
          Pick two different trackers to compare.
        </Text>
      ) : result ? (
        <View style={[styles.resultCard, { borderColor: colors.outlineVariant }]}>
          <Text style={[styles.resultRow, { color: colors.onSurface }]}>
            Both on the same day: {result.both}
          </Text>
          <Text style={[styles.resultRow, { color: colors.onSurfaceVariant }]}>
            {trackerA.name} only: {result.onlyA} (of {result.daysA} active days)
          </Text>
          <Text style={[styles.resultRow, { color: colors.onSurfaceVariant }]}>
            {trackerB.name} only: {result.onlyB} (of {result.daysB} active days)
          </Text>
          {result.daysA > 0 ? (
            <Text style={[styles.resultRow, { color: colors.onSurfaceVariant }]}>
              {Math.round((result.both / result.daysA) * 100)}% of {trackerA.name}&apos;s days also
              had {trackerB.name}
            </Text>
          ) : null}
        </View>
      ) : null}
    </ReportSection>
  );
}

function TrackerPicker({
  label,
  trackers,
  domainsById,
  selectedId,
  onSelect,
}: {
  label: string;
  trackers: Tracker[];
  domainsById: Map<number, Domain>;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const colors = useAppMaterialColors();
  return (
    <View style={styles.pickerBlock}>
      <Text style={[styles.pickerLabel, { color: colors.onSurfaceVariant }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {trackers.map((tracker) => {
          const isSelected = tracker.id === selectedId;
          const domainKey = domainsById.get(tracker.domainId)?.key;
          const tint = domainKey ? DOMAIN_PALETTE[domainKey].color : colors.primary;
          return (
            <Pressable
              key={tracker.id}
              onPress={() => onSelect(tracker.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? tint : colors.surfaceContainerHigh,
                  borderColor: tint,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={[styles.chipText, { color: isSelected ? "#FFFFFF" : tint }]}>
                {tracker.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pickerBlock: {
    gap: 4,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  resultCard: {
    gap: 4,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
  },
  resultRow: {
    fontSize: 13,
  },
  emptyText: {
    fontSize: 13,
  },
});
