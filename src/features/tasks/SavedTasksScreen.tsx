import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { IconButton } from "react-native-paper";

import { Screen } from "@/components/Screen";
import { ScreenBar } from "@/components/ScreenBar";
import { Action, Hint, Row } from "@/components/ui";
import { useDb } from "@/db/DatabaseProvider";
import * as tasks from "@/db/repos/tasks";
import { repeatText, taskLabel } from "@/domain/labels";
import type { TaskWithRepeats } from "@/domain/planBuilder";

/** Saved tasks, from the Today overflow menu. Tap to edit; archive from the edit screen. */
export function SavedTasksScreen() {
  const db = useDb();
  const [rows, setRows] = useState<TaskWithRepeats[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      tasks.listWithRepeatDays(db).then((result) => {
        if (active) setRows(result);
      });
      return () => {
        active = false;
      };
    }, [db]),
  );

  const newTask = () => router.push("/task");

  return (
    <Screen
      bar={
        <ScreenBar
          title="Saved tasks"
          subtitle="Tap one to edit it"
          right={<IconButton icon="plus" accessibilityLabel="New task" onPress={newTask} />}
        />
      }
      scroll={false}
    >
      {rows?.length === 0 ? (
        <View style={styles.empty}>
          <Hint>No saved tasks yet. A task has an amount and a time limit, and can repeat on chosen days.</Hint>
          <Action onPress={newTask}>New task</Action>
        </View>
      ) : (
        <FlatList
          data={rows ?? []}
          keyExtractor={(task) => String(task.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Row
              title={taskLabel(item)}
              description={[`${item.default_minutes} min`, repeatText(item.repeat_days), item.detail]
                .filter(Boolean)
                .join(", ")}
              onPress={() => router.push({ pathname: "/task", params: { id: String(item.id) } })}
            />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20 },
  empty: { paddingHorizontal: 20, gap: 16, paddingTop: 8 },
});
