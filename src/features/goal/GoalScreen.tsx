import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { useKeyboardState } from "react-native-keyboard-controller";
import { Button, Dialog, HelperText, Portal, Text, TextInput } from "react-native-paper";

import { Screen } from "@/components/Screen";
import { ScreenBar } from "@/components/ScreenBar";
import { Action, Hint } from "@/components/ui";
import { useDb } from "@/db/DatabaseProvider";
import * as goals from "@/db/repos/goals";
import { formatDayMonth, today } from "@/domain/dates";
import { daysLeft, TEXT_MAX, validateReason } from "@/domain/goalRules";
import { useAppTheme } from "@/theme";

import { useActiveGoal } from "./useActiveGoal";

function daysLeftText(days: number): string {
  if (days === 0) return "Due today";
  return days === 1 ? "1 day left" : `${days} days left`;
}

function backToToday() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

/** Screen 14: the active goal, with complete and drop actions. */
export function GoalScreen() {
  const db = useDb();
  const theme = useAppTheme();
  const goal = useActiveGoal();
  // Lifts the drop dialog above the keyboard while its field has focus.
  const keyboardHeight = useKeyboardState((state) => (state.isVisible ? state.height : 0));
  const [dialog, setDialog] = useState<"complete" | "drop" | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);

  useEffect(() => {
    if (goal === null) backToToday();
  }, [goal]);

  if (!goal) return <Screen bar={<ScreenBar title="Goal" />} />;

  const todayDate = today();

  async function onComplete() {
    await goals.complete(db, goal!.id);
    setDialog(null);
    backToToday();
  }

  async function onDrop() {
    const error = validateReason(reason);
    setReasonError(error);
    if (error) return;
    await goals.drop(db, goal!.id, reason);
    setDialog(null);
    backToToday();
  }

  function closeDialog() {
    setDialog(null);
    setReason("");
    setReasonError(null);
  }

  const left = daysLeft(goal.due_date, todayDate);
  return (
    <Screen
      bar={<ScreenBar title="Goal" />}
      footer={
        <>
          <Action onPress={() => setDialog("complete")}>Mark complete</Action>
          <Action kind="outlined" onPress={() => setDialog("drop")}>
            Drop goal
          </Action>
          <Hint style={styles.note}>Dropping asks for one line: why.</Hint>
        </>
      }
    >
      <Text variant="headlineMedium" style={styles.title}>
        {goal.title}
      </Text>
      <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
        {`Due ${formatDayMonth(goal.due_date, todayDate)}, ${left === 0 ? "due today" : daysLeftText(left)}`}
      </Text>

      <Portal>
        <Dialog visible={dialog === "complete"} onDismiss={closeDialog}>
          <Dialog.Title>Mark this goal complete?</Dialog.Title>
          <Dialog.Actions>
            <Button onPress={closeDialog}>Cancel</Button>
            <Button onPress={onComplete}>Complete</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={dialog === "drop"} onDismiss={closeDialog} style={{ marginBottom: keyboardHeight }}>
          <Dialog.Title>Drop this goal?</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Why are you dropping it?"
              value={reason}
              onChangeText={setReason}
              maxLength={TEXT_MAX}
              error={Boolean(reasonError)}
              autoFocus
            />
            <HelperText type="error" visible={Boolean(reasonError)}>
              {reasonError}
            </HelperText>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeDialog}>Cancel</Button>
            <Button onPress={onDrop}>Drop goal</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: "500", marginTop: 12 },
  note: { alignItems: "center" },
});
