import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import DraggableFlatList, { ScaleDecorator, type RenderItemParams } from "react-native-draggable-flatlist";
import { Button, HelperText, Icon, Text } from "react-native-paper";

import { Screen } from "@/components/Screen";
import { ScreenBar } from "@/components/ScreenBar";
import { Action, Hint, Label, Row } from "@/components/ui";
import { useDb } from "@/db/DatabaseProvider";
import * as planItems from "@/db/repos/planItems";
import * as tasks from "@/db/repos/tasks";
import type { PlanItem } from "@/db/types";
import { addDays, formatDate, formatMinutes, today } from "@/domain/dates";
import { repeatText } from "@/domain/labels";
import {
  addTask,
  buildDraft,
  dropUnfinished,
  keepUnfinished,
  totalMinutes,
  type Draft,
  type DraftItem,
  type TaskWithRepeats,
} from "@/domain/planBuilder";
import { refreshOutputs } from "@/features/refresh";
import { takeJustCreated } from "@/features/tasks/justCreated";
import { useAppTheme } from "@/theme";

import { AddTaskSheet } from "./AddTaskSheet";

function tasksText(count: number): string {
  return count === 1 ? "1 task" : `${count} tasks`;
}

/**
 * Screen 4, Plan tomorrow. `?date=` plans another day: today is allowed
 * only while it has no plan yet.
 */
export function PlanScreen() {
  const db = useDb();
  const theme = useAppTheme();
  const todayDate = today();
  const date = useLocalSearchParams<{ date?: string }>().date ?? addDays(todayDate, 1);
  const isToday = date === todayDate;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [allTasks, setAllTasks] = useState<TaskWithRepeats[]>([]);
  const [locked, setLocked] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build the draft once; later focus changes must not discard edits.
  useEffect(() => {
    let active = true;
    Promise.all([tasks.listWithRepeatDays(db), planItems.listByDate(db, date), planItems.listByDate(db, todayDate)]).then(
      ([taskRows, existing, todayItems]) => {
        if (!active) return;
        setAllTasks(taskRows);
        setLocked(isToday && existing.length > 0);
        setDraft(buildDraft({ date, today: todayDate, tasks: taskRows, existing, todayItems }));
      },
    );
    return () => {
      active = false;
    };
  }, [db, date, todayDate, isToday]);

  // Returning from New task: refresh the picker and add a task created there.
  useFocusEffect(
    useCallback(() => {
      const createdId = takeJustCreated();
      tasks.listWithRepeatDays(db).then((taskRows) => {
        setAllTasks(taskRows);
        const created = taskRows.find((t) => t.id === createdId);
        if (created) setDraft((current) => (current ? addTask(current, created) : current));
      });
    }, [db]),
  );

  function taskFor(item: PlanItem) {
    return allTasks.find((t) => t.id === item.task_id);
  }

  async function onSave() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      await planItems.savePlan(
        db,
        { date, items: draft.items, dropIds: draft.dropIds },
        { firstPlanToday: isToday },
      );
      refreshOutputs(db);
      if (router.canGoBack()) router.back();
      else router.replace("/");
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : "The plan could not be saved. Try again.");
    }
  }

  const title = isToday ? "Plan today" : "Plan tomorrow";
  const subtitle = draft
    ? `${formatDate(date, todayDate)}${draft.fromRepeats ? ", filled from your repeats" : ""}`
    : formatDate(date, todayDate);
  const bar = <ScreenBar title={title} subtitle={subtitle} />;

  if (!draft) return <Screen bar={bar} />;

  if (locked) {
    return (
      <Screen bar={bar}>
        <Hint>Today already has a plan. Items dated today change only through sessions or Skip today.</Hint>
      </Screen>
    );
  }

  function detailFor(item: DraftItem): string {
    const task = allTasks.find((t) => t.id === item.taskId);
    const repeat = task ? repeatText(task.repeat_days) : null;
    return repeat ? `${item.limitMinutes} min, ${repeat}` : `${item.limitMinutes} min`;
  }

  const header = (
    <View style={styles.pad}>
      {draft.unfinished.length > 0 ? (
        <View style={styles.section}>
          <Label>Unfinished today</Label>
          {draft.unfinished.map((item) => {
            const task = taskFor(item);
            return (
              <Row
                key={item.id}
                title={item.label_snapshot}
                right={
                  <View style={styles.pair}>
                    <Button
                      compact
                      mode="contained-tonal"
                      disabled={!task}
                      onPress={() => task && setDraft(keepUnfinished(draft, item, task))}
                    >
                      Keep
                    </Button>
                    <Button compact onPress={() => setDraft(dropUnfinished(draft, item))}>
                      Drop
                    </Button>
                  </View>
                }
              />
            );
          })}
        </View>
      ) : null}
      {draft.unfinished.length > 0 ? <Label>{isToday ? "Today" : "Tomorrow"}</Label> : null}
      {draft.items.length === 0 ? <Hint style={styles.emptyHint}>Nothing planned yet. Add a saved task or create one.</Hint> : null}
    </View>
  );

  const total = totalMinutes(draft.items);
  const listFooter = (
    <View style={styles.pad}>
      <Button mode="text" icon="plus" onPress={() => setSheetOpen(true)} style={styles.addButton} contentStyle={styles.addContent}>
        Add saved task
      </Button>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {tasksText(draft.items.length)}
        {draft.items.length > 0 ? `, ${formatMinutes(total)}` : ""}
      </Text>
      {error ? <HelperText type="error">{error}</HelperText> : null}
    </View>
  );

  function renderItem({ item, drag, isActive }: RenderItemParams<DraftItem>) {
    return (
      <ScaleDecorator>
        <View style={[styles.pad, isActive && { backgroundColor: theme.colors.elevation.level2 }]}>
          <Row
            title={item.label}
            description={detailFor(item)}
            onLongPress={drag}
            accessibilityHint="Long-press to reorder"
            right={<Icon source="drag-horizontal-variant" size={22} color={theme.colors.onSurfaceVariant} />}
          />
        </View>
      </ScaleDecorator>
    );
  }

  return (
    <Screen
      bar={bar}
      scroll={false}
      footer={
        <Action onPress={onSave} loading={saving}>
          Save plan
        </Action>
      }
    >
      <DraggableFlatList
        data={draft.items}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        onDragEnd={({ data }) => setDraft({ ...draft, items: data })}
        ListHeaderComponent={header}
        ListFooterComponent={listFooter}
        containerStyle={styles.grow}
      />
      <AddTaskSheet
        visible={sheetOpen}
        tasks={allTasks}
        addedTaskIds={new Set(draft.items.map((i) => i.taskId))}
        onAdd={(task) => setDraft(addTask(draft, task))}
        onCreate={(name) => router.push({ pathname: "/task", params: { title: name, from: "plan" } })}
        onDismiss={() => setSheetOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  pad: { paddingHorizontal: 20 },
  section: { marginBottom: 16 },
  pair: { flexDirection: "row", gap: 4 },
  emptyHint: { paddingVertical: 12 },
  addButton: { alignSelf: "flex-start", marginLeft: -12, marginTop: 4 },
  addContent: { height: 48 },
});
