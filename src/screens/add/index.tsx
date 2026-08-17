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
 * opened from the tab bar's floating "+"). Dual-mode via a simple two-button
 * segmented control:
 *  - "Log Entry" — pick an existing tracker and fill its fields
 *    (`log-entry-form.tsx`).
 *  - "New Tracker" — name + domain + frequency + field builder
 *    (`create-tracker-form.tsx` / `field-builder.tsx`).
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

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.surface }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "android" ? 24 : 0}
    >
      <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />
      {mode === "log" ? (
        <LogEntryForm />
      ) : (
        <CreateTrackerForm onCreated={() => setMode("log")} />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16 },
});
