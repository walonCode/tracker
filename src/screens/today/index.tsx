import { Column, Host } from "@expo/ui";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ContributionGraph } from "@/components/contribution-graph";
import { useDailyChecklist } from "@/hooks/use-daily-checklist";
import { useTodaysFeed } from "@/hooks/use-todays-feed";
import { useAppMaterialColors } from "@/theme/material-colors";

import { ChecklistRow } from "./checklist-row";
import { FeedItem } from "./feed-item";
import { useContributionPreview } from "./use-contribution-preview";

/**
 * Today screen: contribution-graph preview, the fixed daily checklist, and
 * today's activity feed, stacked in one scrollable column. Data comes from
 * three independent hooks (`useContributionPreview` here in
 * `src/screens/today/`, `useDailyChecklist`/`useTodaysFeed` in `src/hooks/`)
 * — each owns its own loading/error state and re-fetches on demand, so a
 * checklist toggle only needs to refresh the checklist + feed + graph, not
 * re-render the whole screen from scratch.
 */
export function TodayScreen() {
  const colors = useAppMaterialColors();
  const preview = useContributionPreview();
  const checklist = useDailyChecklist();
  const feed = useTodaysFeed();

  // Each hook already fetches once on mount; this only needs to re-fetch on
  // every *subsequent* focus — e.g. returning from the Add or Prayer Log
  // formSheet, which logs an entry without this screen ever unmounting (a
  // formSheet route stacks above it rather than replacing it), so without
  // this the checklist/feed/graph would silently go stale after every log.
  const hasFocusedOnceRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }
      void Promise.all([preview.refresh(), checklist.refresh(), feed.refresh()]);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh()s are stable useCallbacks
    }, [])
  );

  const handleToggle = async (trackerId: number) => {
    await checklist.toggleTracker(trackerId);
    // A checklist change can move today's cell in the graph and adds/removes
    // a feed row — refresh both so the screen stays consistent without a
    // full reload.
    await Promise.all([preview.refresh(), feed.refresh()]);
  };

  const handleDayPress = (date: string) => {
    router.push({ pathname: "/history", params: { date } });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.heading, { color: colors.onBackground }]}>Today</Text>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
            Last {preview.weeks * 7} days
          </Text>
          {preview.loading ? (
            <ActivityIndicator />
          ) : (
            <ContributionGraph
              data={preview.data}
              weeks={preview.weeks}
              onDayPress={handleDayPress}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Checklist</Text>
          {checklist.loading ? (
            <ActivityIndicator />
          ) : checklist.items.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
              No daily trackers yet.
            </Text>
          ) : (
            <Host matchContents style={styles.hostFullWidth}>
              <Column spacing={0} style={styles.hostFullWidth}>
                {checklist.items.map((item) => (
                  <ChecklistRow
                    key={item.tracker.id}
                    tracker={item.tracker}
                    domain={item.domain}
                    checked={item.checked}
                    progress={item.progress}
                    onToggle={() => handleToggle(item.tracker.id)}
                  />
                ))}
              </Column>
            </Host>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
            Today&apos;s activity
          </Text>
          {feed.loading ? (
            <ActivityIndicator />
          ) : feed.feed.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
              Nothing logged yet today.
            </Text>
          ) : (
            <View>
              {feed.feed.map(({ entry, tracker, domain }) => (
                <FeedItem key={entry.id} entry={entry} tracker={tracker} domain={domain} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyText: {
    fontSize: 14,
  },
  hostFullWidth: {
    width: "100%",
  },
});
