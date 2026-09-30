import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, HelperText, Text, TextInput } from "react-native-paper";

import { ScreenBar } from "@/components/ScreenBar";
import { useDb } from "@/db/DatabaseProvider";
import * as planItems from "@/db/repos/planItems";
import * as sessions from "@/db/repos/sessions";
import type { Session } from "@/db/types";
import { cursorPrefix, usesCursor } from "@/domain/labels";
import { canAnswerPartly, NOTE_MAX, remainingTarget, targetText, type FinishAnswer } from "@/domain/session";
import { AmountStepper } from "@/features/tasks/AmountStepper";

function leave() {
  router.dismissTo("/");
}

/** Screen 10: the finish check after every stop and after the limit. */
export function SessionDoneScreen() {
  const db = useDb();
  const sessionId = Number(useLocalSearchParams<{ session: string }>().session);
  const [session, setSession] = useState<Session | null>(null);
  const [item, setItem] = useState<planItems.DayItem | null>(null);
  const [partly, setPartly] = useState(false);
  const [amount, setAmount] = useState(1);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    sessions.get(db, sessionId).then(async (row) => {
      // Already answered (or unknown): nothing to ask.
      if (!row || row.finished !== null || row.state !== "ended") {
        router.replace("/");
        return;
      }
      setSession(row);
      setItem(await planItems.getWithTask(db, row.plan_item_id));
    });
  }, [db, sessionId]);

  if (!session || !item) return <ScreenBar title="Session done" back={false} />;

  const left = remainingTarget(item);
  const hasCursor = item.cursor !== null && usesCursor(item.unit);
  const nextCursor = hasCursor ? item.cursor! + (partly ? amount : left) : null;
  const usedMinutes = Math.round(item.used_seconds / 60);

  async function answer(result: FinishAnswer) {
    setBusy(true);
    try {
      await sessions.finish(db, sessionId, result, note);
      leave();
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "The answer could not be saved. Try again.");
    }
  }

  return (
    <View style={styles.root}>
      <ScreenBar title="Session done" back={false} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text variant="titleMedium">{item.title}</Text>
        <Text variant="bodyLarge">{`${usedMinutes} of ${item.limit_minutes} min used today`}</Text>
        <Text variant="headlineSmall">{`Did you finish ${targetText(item.unit, item.cursor, left)}?`}</Text>

        <TextInput
          mode="outlined"
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          maxLength={NOTE_MAX}
        />

        {partly ? (
          <View style={styles.partly}>
            <Text variant="labelLarge">{`How many ${item.unit} did you do?`}</Text>
            <AmountStepper label="Amount done" value={amount} min={1} max={left - 1} onChange={setAmount} />
            <Button mode="contained" onPress={() => answer({ kind: "partly", amount })} loading={busy} disabled={busy}>
              Save
            </Button>
          </View>
        ) : (
          <View style={styles.buttons}>
            <Button mode="contained" onPress={() => answer({ kind: "yes" })} loading={busy} disabled={busy}>
              Yes
            </Button>
            {canAnswerPartly(item) ? (
              <Button mode="outlined" onPress={() => setPartly(true)} disabled={busy}>
                Partly
              </Button>
            ) : null}
          </View>
        )}
        {error ? <HelperText type="error">{error}</HelperText> : null}
        {nextCursor !== null ? (
          <Text variant="bodyMedium">{`Next time: from ${cursorPrefix(item.unit)}${nextCursor}`}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 16 },
  buttons: { gap: 12 },
  partly: { gap: 12 },
});
