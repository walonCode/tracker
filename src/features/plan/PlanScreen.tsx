import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import DraggableFlatList, { ScaleDecorator, type RenderItemParams } from "react-native-draggable-flatlist";
import { Button, Divider, HelperText, Icon, List, Text, TouchableRipple } from "react-native-paper";

import { ScreenBar } from "@/components/ScreenBar";
import { useDb } from "@/db/DatabaseProvider";
import * as planItems from "@/db/repos/planItems";
import * as tasks from "@/db/repos/tasks";
import type { PlanItem } from "@/db/types";
import { addDays, formatDate, formatMinutes, today } from "@/domain/dates";
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
import { takeJustCreated } from "@/features/tasks/justCreated";

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
      if (router.canGoBack()) router.back();
      else router.replace("/");
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : "The plan could not be saved. Try again.");
    }
  }

  const title = isToday ? "Plan today" : "Plan tomorrow";
  if (!draft) return <ScreenBar title={title} />;

  if (locked) {
    return (
      <View style={styles.root}>
        <ScreenBar title={title} />
        <Text variant="bodyLarge" style={styles.pad}>
          Today already has a plan. Items dated today change only through sessions or Skip today.
        </Text>
      </View>
    );
  }

  const header = (
    <View>
      <Text variant="titleMedium" style={styles.pad}>
        {formatDate(date, todayDate)}
        {draft.fromRepeats ? ", filled from your repeats" : ""}
      </Text>
      {draft.unfinished.length > 0 ? (
        <View>
          <List.Subheader>Unfinished today</List.Subheader>
          {draft.unfinished.map((item) => {
            const task = taskFor(item);
            return (
              <View key={item.id} style={styles.unfinishedRow}>
                <Text variant="bodyLarge" style={styles.grow}>
                  {item.label_snapshot}
                </Text>
                <Button
                  compact
                  disabled={!task}
                  onPress={() => task && setDraft(keepUnfinished(draft, item, task))}
                >
                  Keep
                </Button>
                <Button compact onPress={() => setDraft(dropUnfinished(draft, item))}>
                  Drop
                </Button>
              </View>
            );
          })}
          <Divider />
        </View>
      ) : null}
      <List.Subheader>{isToday ? "Today" : "Tomorrow"}</List.Subheader>
      {draft.items.length === 0 ? (
        <Text variant="bodyMedium" style={styles.pad}>
          Nothing planned yet.
        </Text>
      ) : null}
    </View>
  );

  const total = totalMinutes(draft.items);
  const footer = (
    <View style={styles.footer}>
      <Button mode="outlined" icon="plus" onPress={() => setSheetOpen(true)}>
        Add saved task
      </Button>
      <Text variant="bodyLarge">
        {tasksText(draft.items.length)}
        {draft.items.length > 0 ? `, ${formatMinutes(total)}` : ""}
      </Text>
      {error ? <HelperText type="error">{error}</HelperText> : null}
      <Button mode="contained" onPress={onSave} loading={saving} disabled={saving}>
        Save plan
      </Button>
    </View>
  );

  function renderItem({ item, drag, isActive }: RenderItemParams<DraftItem>) {
    return (
      <ScaleDecorator>
        <TouchableRipple onLongPress={drag} disabled={isActive} accessibilityHint="Long-press to reorder">
          <View style={styles.row}>
            <Icon source="drag" size={20} />
            <Text variant="bodyLarge" style={styles.grow}>
              {item.label}
            </Text>
            <Text variant="bodyMedium">{`${item.limitMinutes} min`}</Text>
          </View>
        </TouchableRipple>
      </ScaleDecorator>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenBar title={title} />
      <DraggableFlatList
        data={draft.items}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        onDragEnd={({ data }) => setDraft({ ...draft, items: data })}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  grow: { flex: 1 },
  pad: { paddingHorizontal: 16, paddingVertical: 8 },
  unfinishedRow: { flexDirection: "row", alignItems: "center", paddingLeft: 16, paddingRight: 8, gap: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  footer: { padding: 16, gap: 16 },
});
