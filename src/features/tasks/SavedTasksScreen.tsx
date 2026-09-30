import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Appbar, List, Text } from "react-native-paper";

import { ScreenBar } from "@/components/ScreenBar";
import { useDb } from "@/db/DatabaseProvider";
import * as tasks from "@/db/repos/tasks";
import type { Task } from "@/db/types";
import { taskLabel } from "@/domain/labels";

/** Saved tasks, from the Today overflow menu. Tap to edit; archive from the edit screen. */
export function SavedTasksScreen() {
  const db = useDb();
  const [rows, setRows] = useState<Task[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      tasks.list(db).then((result) => {
        if (active) setRows(result);
      });
      return () => {
        active = false;
      };
    }, [db]),
  );

  return (
    <View style={styles.root}>
      <ScreenBar
        title="Saved tasks"
        right={<Appbar.Action icon="plus" accessibilityLabel="New task" onPress={() => router.push("/task")} />}
      />
      {rows?.length === 0 ? (
        <Text variant="bodyLarge" style={styles.empty}>
          No saved tasks yet.
        </Text>
      ) : (
        <FlatList
          data={rows ?? []}
          keyExtractor={(task) => String(task.id)}
          renderItem={({ item }) => (
            <List.Item
              title={taskLabel(item)}
              description={item.detail}
              titleNumberOfLines={2}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => router.push({ pathname: "/task", params: { id: String(item.id) } })}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  empty: { padding: 16 },
});
