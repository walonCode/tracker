import { useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, IconButton, List, Modal, Portal, Text, TextInput } from "react-native-paper";

import type { Task } from "@/db/types";
import { taskLabel } from "@/domain/labels";
import { useAppTheme } from "@/theme";

interface AddTaskSheetProps {
  visible: boolean;
  tasks: readonly Task[];
  addedTaskIds: ReadonlySet<number>;
  onAdd: (task: Task) => void;
  onCreate: (title: string) => void;
  onDismiss: () => void;
}

/** Screen 5: search the saved tasks and add one with a single tap. */
export function AddTaskSheet({ visible, tasks, addedTaskIds, onAdd, onCreate, onDismiss }: AddTaskSheetProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const matches = needle ? tasks.filter((t) => t.title.toLowerCase().includes(needle)) : tasks;

  function close() {
    setQuery("");
    onDismiss();
  }

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={close}
        style={styles.modal}
        contentContainerStyle={[
          styles.sheet,
          { backgroundColor: theme.colors.elevation.level1, paddingBottom: 16 + insets.bottom },
        ]}
      >
        <Text variant="titleMedium" style={styles.title}>
          Add saved task
        </Text>
        <TextInput
          mode="outlined"
          dense
          placeholder="Search"
          left={<TextInput.Icon icon="magnify" />}
          value={query}
          onChangeText={setQuery}
        />
        {matches.length === 0 && needle ? (
          <View style={styles.create}>
            <Button
              mode="text"
              icon="plus"
              onPress={() => {
                const title = query.trim();
                close();
                onCreate(title);
              }}
            >
              {`Create ${query.trim()}`}
            </Button>
          </View>
        ) : (
          <FlatList
            data={matches}
            keyExtractor={(task) => String(task.id)}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            renderItem={({ item }) => {
              const added = addedTaskIds.has(item.id);
              return (
                <List.Item
                  title={taskLabel(item)}
                  titleNumberOfLines={2}
                  right={() =>
                    added ? (
                      <Text variant="labelLarge" style={styles.added}>
                        Added
                      </Text>
                    ) : (
                      <IconButton icon="plus" accessibilityLabel={`Add ${item.title}`} onPress={() => onAdd(item)} />
                    )
                  }
                />
              );
            }}
          />
        )}
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: { justifyContent: "flex-end", margin: 0 },
  sheet: { padding: 16, gap: 8, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "80%" },
  title: { marginBottom: 4 },
  list: { flexGrow: 0 },
  create: { alignItems: "flex-start", paddingVertical: 8 },
  added: { alignSelf: "center", paddingHorizontal: 12 },
});
