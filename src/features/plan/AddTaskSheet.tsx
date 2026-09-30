import { useEffect, useState } from "react";
import { BackHandler, FlatList, Pressable, StyleSheet, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { IconButton, Portal, Text, TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Hint, Label, Row } from "@/components/ui";
import type { Task } from "@/db/types";
import { taskLabel } from "@/domain/labels";
import { useAppTheme } from "@/theme";

interface AddTaskSheetProps {
  visible: boolean;
  tasks: readonly Task[];
  addedTaskIds: ReadonlySet<number>;
  onAdd: (task: Task) => void;
  /** Opens New task; `title` prefills it (empty for a blank form). */
  onCreate: (title: string) => void;
  onDismiss: () => void;
}

/**
 * Screen 5: search saved tasks and add one with a single tap, or create a
 * new one. The first row always offers creating, so an empty list is never
 * a dead end, and the sheet rides above the keyboard.
 */
export function AddTaskSheet({ visible, tasks, addedTaskIds, onAdd, onCreate, onDismiss }: AddTaskSheetProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const matches = needle ? tasks.filter((t) => t.title.toLowerCase().includes(needle)) : tasks;
  const exact = tasks.some((t) => t.title.trim().toLowerCase() === needle);

  function close() {
    setQuery("");
    onDismiss();
  }

  function create() {
    const title = query.trim();
    close();
    onCreate(title);
  }

  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      close();
      return true;
    });
    return () => subscription.remove();
  });

  if (!visible) return null;

  const createRow = (
    <Row
      title={needle && !exact ? `Create “${query.trim()}”` : "New task"}
      description={needle && !exact ? "Opens New task with this name" : "Build a task with an amount and a time limit"}
      onPress={create}
      left={<IconButton icon="plus" mode="contained-tonal" size={18} style={styles.plus} accessibilityLabel="New task" onPress={create} />}
    />
  );

  return (
    <Portal>
      <View style={StyleSheet.absoluteFill}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.backdrop }]}
          onPress={close}
          accessibilityLabel="Close"
        />
        <KeyboardAvoidingView behavior="padding" style={styles.avoider} pointerEvents="box-none">
          <View
            style={[
              styles.sheet,
              { backgroundColor: theme.colors.surface, paddingBottom: 12 + insets.bottom, borderColor: theme.colors.outlineVariant },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: theme.colors.onSurfaceVariant }]} />
            <TextInput
              mode="outlined"
              dense
              placeholder="Search or create a task"
              left={<TextInput.Icon icon="magnify" />}
              value={query}
              onChangeText={setQuery}
              returnKeyType="done"
              onSubmitEditing={() => (needle && !exact ? create() : undefined)}
            />
            <FlatList
              data={matches}
              keyExtractor={(task) => String(task.id)}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              ListHeaderComponent={
                <View>
                  {!exact ? createRow : null}
                  {tasks.length === 0 ? (
                    <Hint style={styles.empty}>No saved tasks yet. Tasks you create are saved here for next time.</Hint>
                  ) : matches.length > 0 ? (
                    <View style={styles.label}>
                      <Label>Saved tasks</Label>
                    </View>
                  ) : null}
                </View>
              }
              renderItem={({ item }) => {
                const added = addedTaskIds.has(item.id);
                return (
                  <Row
                    title={taskLabel(item)}
                    description={`${item.default_minutes} min`}
                    muted={added}
                    right={
                      added ? (
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                          Added
                        </Text>
                      ) : (
                        <IconButton
                          icon="plus"
                          mode="contained-tonal"
                          size={18}
                          style={styles.plus}
                          accessibilityLabel={`Add ${item.title}`}
                          onPress={() => onAdd(item)}
                        />
                      )
                    }
                  />
                );
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  avoider: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    maxHeight: "85%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  handle: { width: 32, height: 4, borderRadius: 2, opacity: 0.5, alignSelf: "center", marginBottom: 6 },
  list: { flexGrow: 0 },
  label: { marginTop: 12 },
  empty: { marginTop: 8 },
  plus: { margin: 0 },
});
