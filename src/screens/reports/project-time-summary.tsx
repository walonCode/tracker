import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { DOMAIN_PALETTE } from "@/theme/domain-palette";
import { useAppMaterialColors } from "@/theme/material-colors";
import type { Domain, EntryWithValues, FieldType, Project, Tracker, TrackerField } from "@/types";

import { indexById } from "./lookups";
import { ReportSection } from "./report-section";

export interface ProjectTimeSummaryProps {
  domains: Domain[];
  trackers: Tracker[];
  projects: Project[];
  fieldsByTrackerId: Map<number, TrackerField[]>;
  /** Entries sliced to the selected range — drives "logged this range". */
  entriesInRange: EntryWithValues[];
  /** Full history, unfiltered by range — drives the all-time total. */
  allEntries: EntryWithValues[];
  rangeLabel: string;
}

const NUMERIC_FIELD_TYPES: readonly FieldType[] = ["duration", "number", "scale"];

interface ProjectTimeRow {
  project: Project;
  domain: Domain | null;
  field: TrackerField | null;
  totalInRange: number;
  totalAllTime: number;
  entryCount: number;
  lastLoggedDate: string | null;
}

function sumField(entries: EntryWithValues[], trackerId: number, fieldId: number): number {
  let total = 0;
  for (const entry of entries) {
    if (entry.trackerId !== trackerId) continue;
    const value = entry.values.find((v) => v.fieldId === fieldId)?.valueNumber;
    if (value !== null && value !== undefined) total += value;
  }
  return total;
}

function formatDuration(value: number, field: TrackerField | null): string {
  const rounded = Math.round(value * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return field?.unit ? `${text} ${field.unit}` : text;
}

/**
 * Projects' dedicated summary: time logged per project (this range + all
 * time), instead of the generic numeric trend line every other tracker
 * kind gets — per the brief, `kind: "project_time"` trackers render here,
 * not in `tracker-trend.tsx`. The plotted field is resolved per-project by
 * checking its tracker's fields for a `duration`-typed field first (falling
 * back to any other numeric-ish field), never by assuming a field named
 * "minutes" exists — the seeded example project happens to use exactly that
 * shape (see `seedExampleProject` in `src/db/seed.ts`), but this doesn't
 * hardcode it.
 */
export function ProjectTimeSummary({
  domains,
  trackers,
  projects,
  fieldsByTrackerId,
  entriesInRange,
  allEntries,
  rangeLabel,
}: ProjectTimeSummaryProps) {
  const colors = useAppMaterialColors();

  const rows = useMemo<ProjectTimeRow[]>(() => {
    const domainsById = indexById(domains);
    const trackersById = indexById(trackers);

    return projects.map((project) => {
      const tracker = trackersById.get(project.trackerId);
      const domain = tracker ? (domainsById.get(tracker.domainId) ?? null) : null;
      const fields = fieldsByTrackerId.get(project.trackerId) ?? [];
      const field =
        fields.find((f) => f.type === "duration") ??
        fields.find((f) => NUMERIC_FIELD_TYPES.includes(f.type)) ??
        null;

      const totalInRange = field ? sumField(entriesInRange, project.trackerId, field.id) : 0;
      const totalAllTime = field ? sumField(allEntries, project.trackerId, field.id) : 0;

      let entryCount = 0;
      let lastLoggedDate: string | null = null;
      for (const entry of allEntries) {
        if (entry.trackerId !== project.trackerId) continue;
        entryCount += 1;
        if (!lastLoggedDate || entry.localDate > lastLoggedDate) lastLoggedDate = entry.localDate;
      }

      return { project, domain, field, totalInRange, totalAllTime, entryCount, lastLoggedDate };
    });
  }, [domains, trackers, projects, fieldsByTrackerId, entriesInRange, allEntries]);

  return (
    <ReportSection title="Projects — time logged">
      {rows.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
          No projects yet.
        </Text>
      ) : (
        rows.map(({ project, domain, field, totalInRange, totalAllTime, entryCount, lastLoggedDate }) => (
          <View key={project.id} style={[styles.card, { borderColor: colors.outlineVariant }]}>
            <View style={styles.cardHeaderRow}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: domain
                      ? DOMAIN_PALETTE[domain.key]?.color
                      : colors.outline,
                  },
                ]}
              />
              <Text style={[styles.cardTitle, { color: colors.onSurface }]}>{project.title}</Text>
              <Text style={[styles.status, { color: colors.onSurfaceVariant }]}>
                {project.status}
              </Text>
            </View>
            <Text style={[styles.stats, { color: colors.onSurfaceVariant }]}>
              {formatDuration(totalInRange, field)} {rangeLabel} ·{" "}
              {formatDuration(totalAllTime, field)} all-time · {entryCount}{" "}
              {entryCount === 1 ? "entry" : "entries"}
            </Text>
            {lastLoggedDate ? (
              <Text style={[styles.stats, { color: colors.onSurfaceVariant }]}>
                Last logged {lastLoggedDate}
              </Text>
            ) : null}
          </View>
        ))
      )}
    </ReportSection>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 4,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  status: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stats: {
    fontSize: 12,
  },
  emptyText: {
    fontSize: 13,
  },
});
