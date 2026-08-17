import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";

import { SegmentedControl } from "@/components/segmented-control";
import { useAppMaterialColors } from "@/theme/material-colors";

import { CreateTrackerForm } from "./create-tracker-form";
import { LogEntryForm } from "./log-entry-form";

type AddMode = "log" | "create";

const MODE_OPTIONS = [
  { value: "log" as const, label: "Log Entry" },
  { value: "create" as const, label: "New Tracker" },
];

/**
 * Add modal screen (rendered from `src/app/add.tsx`, a formSheet route
 * opened from the tab bar's floating "+", but also reused for two other
 * entry points into the same form via route params — `entryId` (History's
 * "tap an entry to fix it" edit flow) and `trackerId` (Today's checklist,
 * for a tracker with fields a plain checkbox tap can't fill in). Dual-mode
 * via a simple two-button segmented control when neither param is set:
 *  - "Log Entry" — pick an existing tracker and fill its fields
 *    (`log-entry-form.tsx`).
 *  - "New Tracker" — name + domain + frequency + field builder
 *    (`create-tracker-form.tsx` / `field-builder.tsx`).
 * Editing an existing entry isn't really "Log" vs "New Tracker", so the
 * segmented control is hidden entirely when `entryId` is present — the
 * form goes straight into edit mode.
 *
 * Built entirely from plain React Native (`TextInput`, `Switch`, `Pressable`
 * chips) rather than `@expo/ui/jetpack-compose` — see the task report for
 * the reasoning. After a tracker is created, mode switches back to "Log
 * Entry" so the newly created tracker is immediately loggable; switching
 * modes unmounts/remounts the forms, so `LogEntryForm` re-fetches the
 * tracker list fresh and picks it up.
 */
export default function AddScreen() {
  const colors = useAppMaterialColors();
  const [mode, setMode] = useState<AddMode>("log");
  const { entryId, trackerId } = useLocalSearchParams<{ entryId?: string; trackerId?: string }>();

  if (entryId !== undefined) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.surface }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "android" ? 24 : 0}
      >
        <LogEntryForm entryId={Number(entryId)} />
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.surface }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "android" ? 24 : 0}
    >
      <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />
      {mode === "log" ? (
        <LogEntryForm initialTrackerId={trackerId !== undefined ? Number(trackerId) : undefined} />
      ) : (
        <CreateTrackerForm onCreated={() => setMode("log")} />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16 },
});
