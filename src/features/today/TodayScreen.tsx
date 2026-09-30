import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState, type ReactElement } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Icon, Menu, ProgressBar, Snackbar, Text } from "react-native-paper";

import { Screen } from "@/components/Screen";
import { ScreenBar, type OverflowItem } from "@/components/ScreenBar";
import { Action, Hint, Row } from "@/components/ui";
import { useDb } from "@/db/DatabaseProvider";
import * as backup from "@/db/repos/backup";
import * as planItems from "@/db/repos/planItems";
import * as sessions from "@/db/repos/sessions";
import type { Session } from "@/db/types";
import { formatLongDate, today } from "@/domain/dates";
import { nextItem } from "@/domain/session";
import { pickAndImport, shareExport } from "@/features/backup/backupActions";
import { GoalCard } from "@/features/goal/GoalCard";
import { useActiveGoal } from "@/features/goal/useActiveGoal";
import { refreshOutputs } from "@/features/refresh";
import { startSession } from "@/features/session/engine";
import { useAppTheme } from "@/theme";

type DayItem = planItems.DayItem;

function minutes(seconds: number): number {
  return Math.round(seconds / 60);
}

/** Screen 7: goal line, today's list with the Next card, then Log and Plan tomorrow. */
export function TodayScreen() {
  const db = useDb();
  const theme = useAppTheme();
  const goal = useActiveGoal();
  const [items, setItems] = useState<DayItem[] | null>(null);
  const [open, setOpen] = useState<Session | null>(null);
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [importable, setImportable] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // A tapped start-time reminder names the item to show as the Next card.
  const focusId = Number(useLocalSearchParams<{ next?: string }>().next);

  const load = useCallback(async () => {
    const [rows, openSession, canImport] = await Promise.all([
      planItems.listDayWithTasks(db, today()),
      sessions.getOpen(db),
      backup.canImport(db),
    ]);
    setItems(rows);
    setOpen(openSession);
    setImportable(canImport);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onExport() {
    try {
      await shareExport(db);
    } catch {
      setMessage("The export could not be written. Check free storage, then try again.");
    }
  }

  async function onImport() {
    try {
      if (await pickAndImport(db)) {
        refreshOutputs(db);
        setMessage("Data imported.");
        await load();
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "The import failed. Nothing was changed.");
    }
  }

  const overflow: OverflowItem[] = [
    { title: "Saved tasks", onPress: () => router.push("/tasks") },
    { title: "Session settings", onPress: () => router.push("/settings") },
    { title: "Export data", onPress: onExport },
    ...(importable ? [{ title: "Import data", onPress: onImport }] : []),
  ];

  async function onStart(item: DayItem) {
    if (open) {
      router.push("/session");
      return;
    }
    setStarting(true);
    try {
      await startSession(db, item.id);
      router.push("/session");
    } catch (e) {
      if (e instanceof sessions.SessionAlreadyOpen) router.push("/session");
      else await load();
    } finally {
      setStarting(false);
    }
  }

  async function onSkip(item: DayItem) {
    setMenuFor(null);
    try {
      await planItems.skip(db, item.id);
      refreshOutputs(db);
    } finally {
      await load();
    }
  }

  const focused = items?.find((i) => i.id === focusId && i.status === "planned");
  const next = focused ?? (items ? nextItem(items) : null);

  function withSkipMenu(item: DayItem, child: ReactElement) {
    return (
      <Menu key={item.id} visible={menuFor === item.id} onDismiss={() => setMenuFor(null)} anchor={child}>
        <Menu.Item leadingIcon="debug-step-over" title="Skip today" onPress={() => onSkip(item)} />
      </Menu>
    );
  }

  function Circle({ done }: { done: boolean }) {
    return done ? (
      <View style={[styles.circle, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}>
        <Icon source="check" size={14} color={theme.colors.onPrimary} />
      </View>
    ) : (
      <View style={[styles.circle, { borderColor: theme.colors.onSurfaceVariant }]} />
    );
  }

  function renderRow(item: DayItem) {
    const done = item.status === "done";
    const closed = item.status === "skipped" || item.status === "dropped";
    const canSkip = item.status === "planned" && open?.plan_item_id !== item.id;
    const trailing = done
      ? `${minutes(item.used_seconds)} / ${item.limit_minutes}`
      : item.status === "skipped"
        ? "Skipped"
        : item.status === "dropped"
          ? "Dropped"
          : `${item.limit_minutes} min`;
    const row = (
      <View>
        <Row
          title={item.label_snapshot}
          struck={done || closed}
          left={closed ? <Icon source="minus-circle-outline" size={24} color={theme.colors.onSurfaceVariant} /> : <Circle done={done} />}
          right={
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {trailing}
            </Text>
          }
          onLongPress={canSkip ? () => setMenuFor(item.id) : undefined}
          accessibilityHint={canSkip ? "Long-press for Skip today" : undefined}
        />
      </View>
    );
    return canSkip ? withSkipMenu(item, row) : <View key={item.id}>{row}</View>;
  }

  function renderNext(item: DayItem) {
    const used = minutes(item.used_seconds);
    const isOpen = open?.plan_item_id === item.id;
    const onTonal = theme.colors.onPrimaryContainer;
    const card = (
      <Pressable
        onLongPress={isOpen ? undefined : () => setMenuFor(item.id)}
        style={[styles.next, { backgroundColor: theme.colors.primaryContainer }]}
        accessibilityHint={isOpen ? undefined : "Long-press for Skip today"}
      >
        <Text variant="labelMedium" style={{ color: onTonal, opacity: 0.85 }}>
          Next
        </Text>
        <Text variant="headlineSmall" style={[styles.nextTitle, { color: onTonal }]}>
          {item.label_snapshot}
        </Text>
        {item.detail ? (
          <Text variant="bodyMedium" style={{ color: onTonal, opacity: 0.85 }}>
            {item.detail}
          </Text>
        ) : null}
        {item.used_seconds > 0 ? (
          <View style={styles.progress}>
            <Text variant="labelMedium" style={{ color: onTonal, opacity: 0.85 }}>
              {`${used} of ${item.limit_minutes} min used`}
            </Text>
            <ProgressBar
              progress={Math.min(1, item.used_seconds / (item.limit_minutes * 60))}
              style={styles.track}
              color={theme.colors.primary}
            />
          </View>
        ) : null}
        <Action onPress={() => onStart(item)} loading={starting} style={styles.start}>
          {isOpen || item.used_seconds > 0 ? "Resume" : "Start"}
        </Action>
      </Pressable>
    );
    return isOpen ? <View key={item.id}>{card}</View> : withSkipMenu(item, card);
  }

  return (
    <Screen
      bar={<ScreenBar title="Today" subtitle={formatLongDate(today())} back={false} menu={overflow} />}
      footer={
        <View style={styles.links}>
          <Button mode="text" onPress={() => router.push("/log")} contentStyle={styles.linkContent}>
            Log
          </Button>
          <Button mode="text" onPress={() => router.push("/plan")} contentStyle={styles.linkContent}>
            Plan tomorrow
          </Button>
        </View>
      }
      contentStyle={styles.content}
    >
      {goal === null ? (
        <Action kind="tonal" onPress={() => router.push({ pathname: "/onboarding/goal", params: { mode: "next" } })}>
          Set your next goal
        </Action>
      ) : goal ? (
        <GoalCard goal={goal} />
      ) : null}

      {items && items.length === 0 ? (
        <View style={styles.empty}>
          <Text variant="titleMedium">Nothing planned for today</Text>
          <Hint>Pick what you will do today, then start the first task.</Hint>
          <Action onPress={() => router.push({ pathname: "/plan", params: { date: today() } })}>Plan today</Action>
        </View>
      ) : null}

      <View>{items?.map((item) => (item === next ? renderNext(item) : renderRow(item)))}</View>

      <Snackbar visible={message !== null} onDismiss={() => setMessage(null)} duration={6000}>
        {message ?? ""}
      </Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  circle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  next: { borderRadius: 16, padding: 16, marginVertical: 8, gap: 4 },
  nextTitle: { fontWeight: "500" },
  progress: { gap: 6, marginTop: 6 },
  track: { height: 6, borderRadius: 3 },
  start: { marginTop: 12 },
  empty: { gap: 12, paddingVertical: 16 },
  links: { flexDirection: "row", justifyContent: "space-between" },
  linkContent: { height: 48 },
});
