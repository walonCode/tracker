import { useKeepAwake } from "expo-keep-awake";
import * as NavigationBar from "expo-navigation-bar";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, BackHandler, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

import { useDb } from "@/db/DatabaseProvider";
import * as planItems from "@/db/repos/planItems";
import * as sessions from "@/db/repos/sessions";
import type { Db, Session } from "@/db/types";
import { nowSeconds } from "@/domain/clock";
import { formatClock } from "@/domain/dates";
import { remainingTarget, targetText } from "@/domain/session";
import { remaining } from "@/domain/sessionMath";
import * as focus from "@/features/focus/focusMode";
import { useAppTheme } from "@/theme";

import { playEndSound } from "./endSound";
import { pausedMsFor, reconcileSessions, stopSession } from "./engine";

type Loaded =
  | { kind: "none" }
  | { kind: "finish"; sessionId: number }
  | { kind: "session"; session: Session; item: planItems.DayItem };

/** Reconciles, then loads the open session with its item. */
async function loadOpenSession(db: Db): Promise<Loaded> {
  const recovery = await reconcileSessions(db);
  if (recovery.kind !== "session") return recovery;
  const session = await sessions.get(db, recovery.sessionId);
  const item = session ? await planItems.getWithTask(db, session.plan_item_id) : null;
  return session && item ? { kind: "session", session, item } : { kind: "none" };
}

/**
 * The status line under the timer: DND on, or one small line when blocking
 * is off (a missing permission, or a service the system killed). Nothing
 * where focus mode is not built in.
 */
function focusStatusLine(now: number): { kind: "on" | "off" } | null {
  if (!focus.focusAvailable) return null;
  if (!focus.blockingPermitted() || !focus.serviceAlive(now * 1000)) return { kind: "off" };
  return focus.getStatus().dndOn ? { kind: "on" } : null;
}

/**
 * Screen 8. The timer is derived from the clock every second, never from a
 * counter. Stop is the only way out; reaching the limit ends the session.
 */
export function SessionScreen() {
  const db = useDb();
  const theme = useAppTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [item, setItem] = useState<planItems.DayItem | null>(null);
  const [now, setNow] = useState(nowSeconds());
  const [stopping, setStopping] = useState(false);
  const [focused, setFocused] = useState(true);
  const ending = useRef(false);

  useKeepAwake();

  // While focused: immersive (status and navigation bars hidden) and no back.
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      NavigationBar.setVisibilityAsync("hidden").catch(() => {});
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => true);
      return () => {
        setFocused(false);
        NavigationBar.setVisibilityAsync("visible").catch(() => {});
        subscription.remove();
      };
    }, []),
  );

  // Reconcile on every focus and foreground return, so a screen left under
  // another one never shows a session that has already ended.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      function refresh() {
        loadOpenSession(db).then((loaded) => {
          if (!active || ending.current) return;
          if (loaded.kind === "none") {
            router.dismissTo("/");
          } else if (loaded.kind === "finish") {
            ending.current = true;
            router.replace({ pathname: "/done", params: { session: String(loaded.sessionId) } });
          } else {
            setSession(loaded.session);
            setItem(loaded.item);
            setNow(nowSeconds());
          }
        });
      }
      refresh();
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") refresh();
      });
      return () => {
        active = false;
        subscription.remove();
      };
    }, [db]),
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(nowSeconds()), 1000);
    return () => clearInterval(timer);
  }, []);

  const left = session && item ? remaining(item, session, now, pausedMsFor(session, now)) : null;

  // The limit: end at the limit time, play the tone, go to the finish check.
  // With focus mode the service plays the tone on the alarm stream instead.
  useEffect(() => {
    if (left !== 0 || !session || session.state !== "running" || ending.current) return;
    ending.current = true;
    reconcileSessions(db).then((recovery) => {
      if (!focus.focusAvailable) playEndSound().catch(() => {});
      const id = recovery.kind === "none" ? session.id : recovery.sessionId;
      router.replace({ pathname: "/done", params: { session: String(id) } });
    });
  }, [db, left, session]);

  async function onStop() {
    if (!session || ending.current) return;
    ending.current = true;
    setStopping(true);
    await stopSession(db, session.id, "stopped");
    router.replace({ pathname: "/done", params: { session: String(session.id) } });
  }

  const status = focusStatusLine(now);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {focused ? <StatusBar hidden /> : null}
      {session && item && left !== null ? (
        <>
          <View style={styles.top}>
            <Text variant="titleSmall">{item.title}</Text>
            <Text variant="headlineSmall" style={styles.center}>
              {targetText(item.unit, item.cursor, remainingTarget(item))}
            </Text>
            {item.detail ? (
              <Text variant="bodyMedium" style={styles.center}>
                {item.detail}
              </Text>
            ) : null}
          </View>
          <View style={styles.middle}>
            <Text variant="displayLarge" style={styles.timer} accessibilityLabel={`${Math.ceil(left / 60)} minutes left`}>
              {formatClock(left)}
            </Text>
            <Text variant="bodyLarge">{`Left today, limit ${item.limit_minutes} min`}</Text>
            {session.state === "paused" ? <Text variant="bodyMedium">Paused during a call</Text> : null}
          </View>
          <View style={styles.bottom}>
            {status?.kind === "on" ? (
              <Text variant="bodyMedium" style={styles.center}>
                Do Not Disturb on, calls allowed
              </Text>
            ) : status?.kind === "off" ? (
              <Button mode="text" compact onPress={() => router.push("/settings")}>
                Blocking is off, permissions missing
              </Button>
            ) : null}
            <Button mode="contained" onPress={onStop} loading={stopping} disabled={stopping} style={styles.stop}>
              Stop
            </Button>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24 },
  top: { alignItems: "center", gap: 8, paddingTop: 32 },
  center: { textAlign: "center" },
  middle: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  timer: { fontVariant: ["tabular-nums"] },
  bottom: { gap: 12, paddingBottom: 16 },
  stop: { alignSelf: "stretch" },
});
