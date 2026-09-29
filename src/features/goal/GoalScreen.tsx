import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Dialog, HelperText, Portal, Text, TextInput } from "react-native-paper";

import { ScreenBar } from "@/components/ScreenBar";
import { useDb } from "@/db/DatabaseProvider";
import * as goals from "@/db/repos/goals";
import { formatDate, today } from "@/domain/dates";
import { daysLeft, TEXT_MAX, validateReason } from "@/domain/goalRules";

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
  const goal = useActiveGoal();
  const [dialog, setDialog] = useState<"complete" | "drop" | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);

  useEffect(() => {
    if (goal === null) backToToday();
  }, [goal]);

  if (!goal) return <ScreenBar title="Goal" />;

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

  return (
    <View style={styles.root}>
      <ScreenBar title="Goal" />
      <View style={styles.body}>
        <Text variant="headlineSmall">{goal.title}</Text>
        <Text variant="bodyLarge">Due {formatDate(goal.due_date, todayDate)}</Text>
        <Text variant="bodyLarge">{daysLeftText(daysLeft(goal.due_date, todayDate))}</Text>
      </View>
      <View style={styles.actions}>
        <Button mode="contained" onPress={() => setDialog("complete")}>
          Mark complete
        </Button>
        <Button mode="outlined" onPress={() => setDialog("drop")}>
          Drop goal
        </Button>
      </View>

      <Portal>
        <Dialog visible={dialog === "complete"} onDismiss={closeDialog}>
          <Dialog.Title>Mark this goal complete?</Dialog.Title>
          <Dialog.Actions>
            <Button onPress={closeDialog}>Cancel</Button>
            <Button onPress={onComplete}>Complete</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={dialog === "drop"} onDismiss={closeDialog}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { padding: 16, gap: 8 },
  actions: { padding: 16, gap: 12 },
});
