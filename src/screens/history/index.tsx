import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { type HistoryEntryItem, useHistory } from "@/hooks/use-history";
import { isValidLocalDateKey } from "@/lib/dates";
import { useAppMaterialColors } from "@/theme/material-colors";

import { DayGroupHeader } from "./day-group";
import { DomainFilter } from "./domain-filter";
import { EntryRow } from "./entry-row";

/**
 * History tab: a reverse-chronological, day-grouped log of every entry ever
 * recorded, with an All/Daily/Finance/Projects/Others domain filter.
 *
 * Deep-link: Today's contribution-graph tap is expected to navigate here
 * with a `?date=YYYY-MM-DD` query param (read via `useLocalSearchParams`).
 * Per the brief, that scrolls the still-full list to the tapped day (and
 * highlights its header) rather than hard-filtering down to just that one
 * day — the domain filter stays orthogonal to the deep-link.
 */
export default function HistoryScreen() {
  const colors = useAppMaterialColors();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const {
    loading,
    refreshing,
    error,
    domainFilter,
    setDomainFilter,
    sections,
    isEmpty,
    refresh,
  } = useHistory();

  const listRef = useRef<SectionList<HistoryEntryItem>>(null);
  const scrolledForParam = useRef<string | null>(null);

  const targetDate = useMemo(() => {
    if (!dateParam || !isValidLocalDateKey(dateParam)) return null;
    return dateParam;
  }, [dateParam]);

  useEffect(() => {
    if (!targetDate || scrolledForParam.current === targetDate) return;
    const sectionIndex = sections.findIndex((section) => section.date === targetDate);
    if (sectionIndex === -1) return;

    scrolledForParam.current = targetDate;
    // Deferred a tick so SectionList has committed its initial layout
    // before we ask it to scroll — calling scrollToLocation on the same
    // frame as first render can silently no-op.
    const timer = setTimeout(() => {
      listRef.current?.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        animated: true,
        viewPosition: 0,
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [targetDate, sections]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DomainFilter value={domainFilter} onChange={setDomainFilter} />
      {error ? (
        <Text style={[styles.errorText, { color: colors.error }]}>
          Couldn&apos;t load history: {error.message}
        </Text>
      ) : null}
      {isEmpty ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
            {domainFilter === "all"
              ? "No entries yet. Log something from the Add tab to see it here."
              : "No entries for this filter yet."}
          </Text>
        </View>
      ) : (
        <SectionList
          ref={listRef}
          sections={sections.map((section) => ({
            title: section.date,
            data: section.items,
          }))}
          keyExtractor={(item) => String(item.entry.id)}
          renderItem={({ item }) => <EntryRow item={item} />}
          renderSectionHeader={({ section }) => (
            <DayGroupHeader date={section.title} highlighted={section.title === targetDate} />
          )}
          stickySectionHeadersEnabled
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.primary}
            />
          }
          onScrollToIndexFailed={() => {
            // Best-effort deep link: if the list can't resolve an offset
            // yet, just leave the user at the top instead of crashing.
          }}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  listContent: {
    paddingBottom: 24,
  },
  errorText: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 14,
  },
});
