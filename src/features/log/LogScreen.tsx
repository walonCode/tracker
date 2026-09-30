import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FlatList, ScrollView, StyleSheet, View } from "react-native";
import { Divider, Text } from "react-native-paper";

import { Screen } from "@/components/Screen";
import { ScreenBar } from "@/components/ScreenBar";
import { ChoiceChip } from "@/components/ui";
import { useDb } from "@/db/DatabaseProvider";
import * as log from "@/db/repos/log";
import { daysBetween, formatDate, formatMinutes, localDate, mondayOf, today, type LocalDate } from "@/domain/dates";
import { buildGrid, gridRange, shadeLevel } from "@/domain/heatmap";
import { dayItemText, entryLabel } from "@/domain/logText";
import type { TaskWithRepeats } from "@/domain/planBuilder";
import { runCounter } from "@/domain/runCounter";
import { useAppTheme } from "@/theme";

import { Heatmap, Legend, type CellValue } from "./Heatmap";

const PAGE = 30;
const MIN_DAYS_OF_DATA = 7;
const EMPTY_TEXT = "Your log fills in as you finish sessions.";

type Row = { kind: "entry"; entry: log.Entry } | { kind: "item"; item: log.DayDetailItem };

/** One log entry: a small context line over the main line, with an optional "Ended early" tag. */
function LogRow({ small, main, early }: { small: string | null; main: string; early: boolean }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.outlineVariant }]}>
      <View style={styles.line}>
        <View style={styles.grow}>
          {small ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {small}
            </Text>
          ) : null}
          <Text variant="bodyLarge">{main}</Text>
        </View>
        {early ? (
          <Text variant="labelSmall" style={[styles.tag, { borderColor: theme.colors.outline, color: theme.colors.onSurfaceVariant }]}>
            Ended early
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Screens 11 to 13: the heatmap, one summary line, and the entries or a day's detail. */
export function LogScreen() {
  const db = useDb();
  const theme = useAppTheme();
  const todayDate = today();
  const grid = useMemo(() => buildGrid(todayDate), [todayDate]);
  const range = gridRange(grid);

  const [tasks, setTasks] = useState<TaskWithRepeats[]>([]);
  const [taskId, setTaskId] = useState<number | null>(null);
  const [selected, setSelected] = useState<LocalDate | null>(null);
  const [minutes, setMinutes] = useState<Map<LocalDate, number>>(new Map());
  const [hits, setHits] = useState<Set<LocalDate>>(new Set());
  // Results remember what they were loaded for, so a stale one is never shown.
  const [runFor, setRunFor] = useState<{ taskId: number; run: number } | null>(null);
  const [entries, setEntries] = useState<log.Entry[]>([]);
  const [entriesDone, setEntriesDone] = useState(false);
  const [detailFor, setDetailFor] = useState<{ date: LocalDate; items: log.DayDetailItem[] } | null>(null);

  const task = tasks.find((t) => t.id === taskId) ?? null;
  const run = task && runFor?.taskId === task.id ? runFor.run : null;
  const detail =
    selected !== null && detailFor?.date === selected
      ? detailFor.items.filter((i) => taskId === null || i.task_id === taskId)
      : [];

  useEffect(() => {
    log.tasksWithHistory(db).then(setTasks);
  }, [db]);

  // Grid values, the run counter, and the first page of entries for the filter.
  useEffect(() => {
    let active = true;
    const filter = taskId ?? undefined;
    Promise.all([
      log.dailyMinutes(db, range.from, range.to, filter),
      filter === undefined ? Promise.resolve([]) : log.dailyHits(db, range.from, range.to, filter),
      log.entries(db, PAGE, 0, filter),
    ]).then(([rows, hitDates, firstPage]) => {
      if (!active) return;
      setMinutes(new Map(rows.map((r) => [r.plan_date, Math.round(r.seconds / 60)])));
      setHits(new Set(hitDates));
      setEntries(firstPage);
      setEntriesDone(firstPage.length < PAGE);
    });
    return () => {
      active = false;
    };
  }, [db, taskId, range.from, range.to]);

  useEffect(() => {
    if (!task) return;
    let active = true;
    const createdOn = localDate(task.created_at);
    const from = "0000-01-01";
    Promise.all([log.scheduledDates(db, task.id, from, todayDate), log.dailyHits(db, from, todayDate, task.id)]).then(
      ([planned, done]) => {
        if (!active) return;
        const run = runCounter({
          today: todayDate,
          createdOn,
          repeatDays: task.repeat_days,
          plannedDates: new Set(planned),
          doneDates: new Set(done),
        });
        setRunFor({ taskId: task.id, run });
      },
    );
    return () => {
      active = false;
    };
  }, [db, task, todayDate]);

  useEffect(() => {
    if (selected === null) return;
    let active = true;
    log.dayDetail(db, selected).then((items) => {
      if (active) setDetailFor({ date: selected, items });
    });
    return () => {
      active = false;
    };
  }, [db, selected]);

  // onEndReached can fire again before a page lands: one request at a time,
  // and a page loaded for a previous filter is dropped.
  const loadingMore = useRef(false);
  const filterRef = useRef(taskId);
  useEffect(() => {
    filterRef.current = taskId;
  }, [taskId]);

  const loadMore = useCallback(() => {
    // A short list fires onEndReached on mount; the first page comes from the effect above.
    if (entriesDone || selected !== null || loadingMore.current || entries.length === 0) return;
    loadingMore.current = true;
    const filter = taskId;
    log
      .entries(db, PAGE, entries.length, filter ?? undefined)
      .then((page) => {
        if (filterRef.current !== filter) return;
        setEntries((current) => {
          const seen = new Set(current.map((e) => e.id));
          return [...current, ...page.filter((e) => !seen.has(e.id))];
        });
        if (page.length < PAGE) setEntriesDone(true);
      })
      .finally(() => {
        loadingMore.current = false;
      });
  }, [db, entries.length, entriesDone, selected, taskId]);

  function valueFor(date: LocalDate): CellValue {
    if (task) return { kind: "hit", hit: hits.has(date) };
    const m = minutes.get(date) ?? 0;
    return { kind: "minutes", minutes: m, level: shadeLevel(m) };
  }

  const daysWithData = [...minutes.values()].filter((m) => m > 0).length;
  const empty = task ? minutes.size === 0 && hits.size === 0 : daysWithData < MIN_DAYS_OF_DATA;

  const weekMinutes = [...minutes.entries()]
    .filter(([date]) => daysBetween(mondayOf(todayDate), date) >= 0 && daysBetween(date, todayDate) >= 0)
    .reduce((sum, [, m]) => sum + m, 0);

  let summary: ReactNode;
  if (selected !== null) {
    summary = (
      <Text variant="bodyLarge">
        <Text style={styles.bold}>{formatDate(selected, todayDate)}</Text>
        {`, ${formatMinutes(minutes.get(selected) ?? 0)}`}
      </Text>
    );
  } else if (task) {
    summary =
      run !== null && !empty ? (
        <View>
          <Text style={styles.big}>{run === 1 ? "1 day" : `${run} days`}</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Current run of limit hit
          </Text>
        </View>
      ) : null;
  } else {
    summary = (
      <Text variant="bodyLarge">
        {"This week: "}
        <Text style={styles.bold}>{formatMinutes(weekMinutes)}</Text>
      </Text>
    );
  }

  const rows: Row[] =
    selected !== null
      ? detail.map((item) => ({ kind: "item", item }))
      : entries.map((entry) => ({ kind: "entry", entry }));

  const header = (
    <View style={styles.header}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <ChoiceChip selected={taskId === null} onPress={() => setTaskId(null)}>
          All
        </ChoiceChip>
        {tasks.map((t) => (
          <ChoiceChip key={t.id} selected={taskId === t.id} onPress={() => setTaskId(t.id)}>
            {t.title}
          </ChoiceChip>
        ))}
      </ScrollView>
      <Heatmap grid={grid} today={todayDate} valueFor={valueFor} selected={selected} onSelect={setSelected} />
      <Legend perTask={task !== null} />
      <View style={styles.pad}>
        {empty && selected === null ? <Text variant="bodyLarge">{EMPTY_TEXT}</Text> : summary}
      </View>
      <Divider />
    </View>
  );

  return (
    <Screen bar={<ScreenBar title="Log" />} scroll={false}>
      <FlatList
        data={rows}
        keyExtractor={(row) => (row.kind === "entry" ? `e${row.entry.id}` : `i${row.item.id}`)}
        ListHeaderComponent={header}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        renderItem={({ item: row }) => {
          if (row.kind === "entry") {
            const date = formatDate(row.entry.plan_date, todayDate);
            const label = entryLabel(row.entry);
            return (
              <LogRow
                small={row.entry.note ? `${date}, ${label}` : date}
                main={row.entry.note ?? label}
                early={row.entry.end_reason === "early_exit"}
              />
            );
          }
          const notes = row.item.sessions.filter((s) => s.note).map((s) => s.note!);
          return (
            <LogRow
              small={notes.length > 0 ? dayItemText(row.item) : null}
              main={notes.length > 0 ? notes.join("\n") : dayItemText(row.item)}
              early={row.item.sessions.some((s) => s.end_reason === "early_exit")}
            />
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { gap: 12, paddingTop: 8 },
  chips: { gap: 8, paddingHorizontal: 20 },
  pad: { paddingHorizontal: 20, paddingBottom: 8 },
  row: { marginHorizontal: 20, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  bold: { fontWeight: "500" },
  big: { fontSize: 38, fontWeight: "500", letterSpacing: -1 },
  line: { flexDirection: "row", alignItems: "center", gap: 8 },
  grow: { flex: 1 },
  tag: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, opacity: 0.8 },
});
