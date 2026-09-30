import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Dialog, Portal, Text } from "react-native-paper";

import { useDb } from "@/db/DatabaseProvider";
import * as planItems from "@/db/repos/planItems";
import * as sessions from "@/db/repos/sessions";
import type { Session } from "@/db/types";
import { nowSeconds } from "@/domain/clock";
import { formatClock } from "@/domain/dates";
import { remaining } from "@/domain/sessionMath";
import { pausedMsFor, stopSession } from "@/features/session/engine";
import { useAppTheme } from "@/theme";

const END_COUNTDOWN_SECONDS = 10;

function backToSession() {
  if (router.canGoBack()) router.back();
  else router.replace("/session");
}

/**
 * Screen 9, opened by the focus service over a blocked app. Ending here
 * waits behind a 10 second countdown and a confirm, and is logged as
 * `early_exit`.
 */
export function BlockedScreen() {
  const db = useDb();
  const theme = useAppTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [item, setItem] = useState<planItems.DayItem | null>(null);
  const [now, setNow] = useState(nowSeconds());
  const [countdown, setCountdown] = useState<number | null>(null);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    sessions.getOpen(db).then(async (open) => {
      if (!open) {
        router.replace("/");
        return;
      }
      setSession(open);
      setItem(await planItems.getWithTask(db, open.plan_item_id));
    });
  }, [db]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(nowSeconds());
      setCountdown((current) => (current === null ? null : Math.max(0, current - 1)));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // The confirm opens once the countdown reaches zero.
  const confirming = countdown === 0;

  async function onEnd() {
    if (!session) return;
    setEnding(true);
    await stopSession(db, session.id, "early_exit");
    router.replace({ pathname: "/done", params: { session: String(session.id) } });
  }

  function cancelEnd() {
    setCountdown(null);
  }

  const left = session && item ? remaining(item, session, now, pausedMsFor(session, now)) : null;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.middle}>
        <Text variant="headlineMedium">Session running</Text>
        {item ? (
          <Text variant="titleMedium" style={styles.center}>
            {item.label_snapshot}
          </Text>
        ) : null}
        {left !== null ? (
          <Text variant="displayMedium" style={styles.timer}>
            {formatClock(left)}
          </Text>
        ) : null}
        {left !== null ? <Text variant="bodyLarge">left today</Text> : null}
      </View>
      <View style={styles.actions}>
        <Button mode="contained" onPress={backToSession}>
          Back to session
        </Button>
        <Button
          mode="text"
          onPress={() => setCountdown(END_COUNTDOWN_SECONDS)}
          disabled={countdown !== null || !session}
        >
          {countdown !== null && countdown > 0 ? `End session (${countdown})` : "End session"}
        </Button>
      </View>

      <Portal>
        <Dialog visible={confirming} onDismiss={cancelEnd}>
          <Dialog.Title>Still want to end?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">The log will show this session as ended early.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={cancelEnd}>Keep going</Button>
            <Button onPress={onEnd} loading={ending} disabled={ending}>
              End session
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24 },
  middle: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  center: { textAlign: "center" },
  timer: { fontVariant: ["tabular-nums"] },
  actions: { gap: 12, paddingBottom: 16 },
});
