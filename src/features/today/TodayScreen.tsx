import { router, useFocusEffect } from "expo-router";
import { useCallback, useState, type ReactElement } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Icon, Menu, ProgressBar, Text, TouchableRipple } from "react-native-paper";

import { ScreenBar, type OverflowItem } from "@/components/ScreenBar";
import { useDb } from "@/db/DatabaseProvider";
import * as planItems from "@/db/repos/planItems";
import * as sessions from "@/db/repos/sessions";
import type { Session } from "@/db/types";
import { today } from "@/domain/dates";
import { nextItem } from "@/domain/session";
import { GoalCard } from "@/features/goal/GoalCard";
import { useActiveGoal } from "@/features/goal/useActiveGoal";
import { startSession } from "@/features/session/engine";
import { useAppTheme } from "@/theme";

// Plan 7 adds Export data.
const OVERFLOW_ITEMS: OverflowItem[] = [
  { title: "Saved tasks", onPress: () => router.push("/tasks") },
  { title: "Session settings", onPress: () => router.push("/settings") },
];

type DayItem = planItems.DayItem;

function minutes(seconds: number): number {
  return Math.round(seconds / 60);
}

/** Screen 7: goal card, today's list with the Next card, then Plan tomorrow. */
export function TodayScreen() {
  const db = useDb();
  const theme = useAppTheme();
  const goal = useActiveGoal();
  const [items, setItems] = useState<DayItem[] | null>(null);
  const [open, setOpen] = useState<Session | null>(null);
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    const [rows, openSession] = await Promise.all([planItems.listDayWithTasks(db, today()), sessions.getOpen(db)]);
    setItems(rows);
    setOpen(openSession);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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
    } finally {
      await load();
    }
  }

  const next = items ? nextItem(items) : null;

  function withSkipMenu(item: DayItem, child: ReactElement) {
    return (
      <Menu
        key={item.id}
        visible={menuFor === item.id}
        onDismiss={() => setMenuFor(null)}
        anchor={child}
      >
        <Menu.Item leadingIcon="debug-step-over" title="Skip today" onPress={() => onSkip(item)} />
      </Menu>
    );
  }

  function renderRow(item: DayItem) {
    const done = item.status === "done";
    const closed = item.status === "skipped" || item.status === "dropped";
    const canSkip = item.status === "planned" && open?.plan_item_id !== item.id;
    const row = (
      <TouchableRipple
        onLongPress={canSkip ? () => setMenuFor(item.id) : undefined}
        accessibilityHint={canSkip ? "Long-press for Skip today" : undefined}
      >
        <View style={styles.row}>
          <Icon
            source={done ? "check-circle" : closed ? "minus-circle-outline" : "circle-outline"}
            size={22}
            color={done ? theme.colors.primary : theme.colors.onSurfaceVariant}
          />
          <Text
            variant="bodyLarge"
            style={[styles.grow, (done || closed) && styles.struck, closed && { color: theme.colors.onSurfaceVariant }]}
          >
            {item.label_snapshot}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {done
              ? `${minutes(item.used_seconds)} / ${item.limit_minutes}`
              : item.status === "skipped"
                ? "Skipped"
                : item.status === "dropped"
                  ? "Dropped"
                  : ""}
          </Text>
        </View>
      </TouchableRipple>
    );
    return canSkip ? withSkipMenu(item, row) : <View key={item.id}>{row}</View>;
  }

  function renderNext(item: DayItem) {
    const used = minutes(item.used_seconds);
    const isOpen = open?.plan_item_id === item.id;
    const card = (
      <Card mode="contained" onLongPress={isOpen ? undefined : () => setMenuFor(item.id)}>
        <Card.Content style={styles.nextContent}>
          <Text variant="labelMedium">Next</Text>
          <Text variant="titleMedium">{item.label_snapshot}</Text>
          {item.detail ? <Text variant="bodyMedium">{item.detail}</Text> : null}
          {item.used_seconds > 0 ? (
            <View style={styles.progress}>
              <Text variant="bodySmall">{`${used} of ${item.limit_minutes} min used`}</Text>
              <ProgressBar progress={Math.min(1, item.used_seconds / (item.limit_minutes * 60))} />
            </View>
          ) : null}
        </Card.Content>
        <Card.Actions>
          <Button mode="contained" onPress={() => onStart(item)} loading={starting} disabled={starting}>
            {isOpen || item.used_seconds > 0 ? "Resume" : "Start"}
          </Button>
        </Card.Actions>
      </Card>
    );
    return isOpen ? <View key={item.id}>{card}</View> : withSkipMenu(item, card);
  }

  return (
    <View style={styles.root}>
      <ScreenBar title="Today" back={false} menu={OVERFLOW_ITEMS} />
      <ScrollView contentContainerStyle={styles.body}>
        {goal === null ? (
          <Button
            mode="contained"
            style={styles.nextGoal}
            onPress={() => router.push({ pathname: "/onboarding/goal", params: { mode: "next" } })}
          >
            Set your next goal
          </Button>
        ) : goal ? (
          <GoalCard goal={goal} />
        ) : null}

        {items && items.length === 0 ? (
          <View style={styles.empty}>
            <Text variant="bodyLarge">Nothing planned for today</Text>
            <Button mode="outlined" onPress={() => router.push({ pathname: "/plan", params: { date: today() } })}>
              Plan today
            </Button>
          </View>
        ) : null}

        <View>{items?.map((item) => (item === next ? renderNext(item) : renderRow(item)))}</View>

        <View style={styles.links}>
          <Button mode="text" onPress={() => router.push("/plan")}>
            Plan tomorrow
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { padding: 16, gap: 16 },
  grow: { flex: 1 },
  struck: { textDecorationLine: "line-through" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 4 },
  nextContent: { gap: 4 },
  progress: { gap: 4, marginTop: 4 },
  nextGoal: { alignSelf: "center" },
  empty: { alignItems: "center", gap: 12, paddingVertical: 24 },
  links: { flexDirection: "row", justifyContent: "center" },
});
