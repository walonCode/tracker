import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { HelperText, Text, TextInput } from "react-native-paper";

import { Screen } from "@/components/Screen";
import { ScreenBar } from "@/components/ScreenBar";
import { Action, Hint, Label } from "@/components/ui";
import { useDb } from "@/db/DatabaseProvider";
import * as planItems from "@/db/repos/planItems";
import * as sessions from "@/db/repos/sessions";
import type { Session } from "@/db/types";
import { cursorPrefix, usesCursor } from "@/domain/labels";
import { canAnswerPartly, NOTE_MAX, remainingTarget, targetText, type FinishAnswer } from "@/domain/session";
import { refreshOutputs } from "@/features/refresh";
import { AmountStepper } from "@/features/tasks/AmountStepper";
import { useAppTheme } from "@/theme";

function leave() {
  router.dismissTo("/");
}

/** Screen 10: the finish check after every stop and after the limit. */
export function SessionDoneScreen() {
  const db = useDb();
  const theme = useAppTheme();
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

  if (!session || !item) return <Screen bar={<ScreenBar title="Session done" back={false} />} />;

  const left = remainingTarget(item);
  const hasCursor = item.cursor !== null && usesCursor(item.unit);
  const nextCursor = hasCursor ? item.cursor! + (partly ? amount : left) : null;
  const usedMinutes = Math.round(item.used_seconds / 60);

  async function answer(result: FinishAnswer) {
    setBusy(true);
    try {
      await sessions.finish(db, sessionId, result, note);
      refreshOutputs(db);
      leave();
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "The answer could not be saved. Try again.");
    }
  }

  return (
    <Screen
      bar={<ScreenBar title="Session done" subtitle={item.title} back={false} />}
      footer={
        partly ? (
          <Action onPress={() => answer({ kind: "partly", amount })} loading={busy}>
            Save
          </Action>
        ) : (
          <>
            <Action onPress={() => answer({ kind: "yes" })} loading={busy}>
              Yes
            </Action>
            {canAnswerPartly(item) ? (
              <Action kind="tonal" onPress={() => setPartly(true)} disabled={busy}>
                Partly
              </Action>
            ) : null}
          </>
        )
      }
    >
      <View style={styles.question}>
        <Text variant="headlineSmall" style={styles.target}>
          {targetText(item.unit, item.cursor, left)}
        </Text>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
          {`Did you finish it? ${usedMinutes} of ${item.limit_minutes} min used today.`}
        </Text>
      </View>

      {partly ? (
        <View style={styles.partly}>
          <Label>{`How many ${item.unit} did you do?`}</Label>
          <AmountStepper label="Amount done" value={amount} min={1} max={left - 1} onChange={setAmount} />
        </View>
      ) : null}

      <TextInput
        mode="outlined"
        label="One line, optional"
        placeholder="What stood out"
        value={note}
        onChangeText={setNote}
        maxLength={NOTE_MAX}
      />
      {error ? <HelperText type="error">{error}</HelperText> : null}
      {nextCursor !== null ? <Hint>{`Next time: from ${cursorPrefix(item.unit)}${nextCursor}`}</Hint> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  question: { gap: 6, marginTop: 8 },
  target: { fontWeight: "500" },
  partly: { gap: 8 },
});
