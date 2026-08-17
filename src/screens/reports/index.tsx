import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { type ReportRange, useReportsData } from "@/hooks/use-reports-data";
import { useAppMaterialColors } from "@/theme/material-colors";

import { CoOccurrence } from "./co-occurrence";
import { DomainTotals } from "./domain-totals";
import { FinanceBreakdown } from "./finance-breakdown";
import { ProjectTimeSummary } from "./project-time-summary";
import { RangeSelector } from "./range-selector";
import { StreakSummary } from "./streak-summary";
import { TrackerTrend } from "./tracker-trend";

const RANGE_LABELS: Record<ReportRange, string> = {
  week: "this week",
  month: "this month",
  all: "all time",
};

/**
 * Reports screen: the range-scoped aggregation views (domain totals, trend
 * charts, Finance breakdown, Projects time-logged summary, cross-domain
 * co-occurrence) plus the always-full-history streak summary, stacked in one
 * scrollable column. All data comes from the single `useReportsData` hook —
 * it fetches every domain/tracker/field/project/entry once and each section
 * below does its own small client-side reduce/group-by over that shared
 * data, per the task brief (no separate SQL aggregation layer).
 *
 * Finance and Projects render their domain-specific sections
 * (`finance-breakdown.tsx`, `project-time-summary.tsx`) instead of a generic
 * trend chart — `tracker-trend.tsx` explicitly excludes Finance-domain
 * trackers and `kind: "project_time"` trackers so those two views aren't
 * duplicated.
 *
 * Content-only (no SafeAreaView/heading of its own) — it's embedded as the
 * "Reports" pane of `src/screens/insights`, which owns the shared safe area
 * and heading for both the History and Reports panes.
 */
export function ReportsScreen() {
  const colors = useAppMaterialColors();
  const {
    loading,
    refreshing,
    error,
    range,
    setRange,
    domains,
    trackers,
    projects,
    fieldsByTrackerId,
    allEntries,
    entriesInRange,
    refresh,
  } = useReportsData();

  const rangeLabel = RANGE_LABELS[range];

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.safeArea}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
      }
    >
        {error ? (
          <Text style={[styles.errorText, { color: colors.error }]}>
            Couldn&apos;t load reports: {error.message}
          </Text>
        ) : null}

        <RangeSelector value={range} onChange={setRange} />

        <DomainTotals
          domains={domains}
          trackers={trackers}
          entries={entriesInRange}
          rangeLabel={rangeLabel}
        />

        <TrackerTrend
          domains={domains}
          trackers={trackers}
          fieldsByTrackerId={fieldsByTrackerId}
          entries={entriesInRange}
          rangeLabel={rangeLabel}
        />

        <FinanceBreakdown
          domains={domains}
          trackers={trackers}
          fieldsByTrackerId={fieldsByTrackerId}
          entriesInRange={entriesInRange}
          allEntries={allEntries}
          rangeLabel={rangeLabel}
        />

        <ProjectTimeSummary
          domains={domains}
          trackers={trackers}
          projects={projects}
          fieldsByTrackerId={fieldsByTrackerId}
          entriesInRange={entriesInRange}
          allEntries={allEntries}
          rangeLabel={rangeLabel}
        />

        <StreakSummary domains={domains} trackers={trackers} allEntries={allEntries} />

        <CoOccurrence
          domains={domains}
          trackers={trackers}
          entries={entriesInRange}
          rangeLabel={rangeLabel}
        />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 16,
    paddingTop: 4,
    gap: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
  },
  errorText: {
    fontSize: 13,
  },
});
