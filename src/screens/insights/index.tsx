import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import HistoryScreen from "@/screens/history";
import { ReportsScreen } from "@/screens/reports";
import { SegmentedControl } from "@/components/segmented-control";
import { useAppMaterialColors } from "@/theme/material-colors";

type InsightsMode = "history" | "reports";

const MODE_OPTIONS = [
  { value: "history" as const, label: "History" },
  { value: "reports" as const, label: "Reports" },
];

/**
 * Merged "Insights" tab: History's day-grouped entry log and Reports'
 * aggregations, switched via one segmented control instead of two separate
 * bottom-tab slots. Owns the single SafeAreaView + heading for both panes;
 * `HistoryScreen`/`ReportsScreen` are content-only now (see their own
 * files) so there's exactly one top inset and one heading, not two stacked
 * ones.
 *
 * Only the active pane is mounted (matches the Add modal's Log/New Tracker
 * toggle pattern) — switching is infrequent enough that re-fetching on
 * return is preferable to keeping both screens' data hooks alive at once.
 *
 * A `?date=` param (from Today's contribution-graph tap, which still routes
 * here) forces History mode on first render regardless of the last-used
 * tab, since that's the pane the deep link is actually for.
 */
export default function InsightsScreen() {
  const colors = useAppMaterialColors();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const [mode, setMode] = useState<InsightsMode>(dateParam ? "history" : "reports");

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={[styles.heading, { color: colors.onBackground }]}>Insights</Text>
        <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />
      </View>
      <View style={styles.body}>
        {mode === "history" ? <HistoryScreen /> : <ReportsScreen />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
  },
  body: { flex: 1 },
});
