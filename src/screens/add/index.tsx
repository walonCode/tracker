import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppMaterialColors } from "@/theme/material-colors";

import { CreateTrackerForm } from "./create-tracker-form";
import { LogEntryForm } from "./log-entry-form";

type AddMode = "log" | "create";

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
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.segmented, { borderColor: colors.outlineVariant }]}>
        <SegmentButton
          label="Log Entry"
          active={mode === "log"}
          onPress={() => setMode("log")}
        />
        <SegmentButton
          label="New Tracker"
          active={mode === "create"}
          onPress={() => setMode("create")}
        />
      </View>
      {mode === "log" ? (
        <LogEntryForm />
      ) : (
        <CreateTrackerForm onCreated={() => setMode("log")} />
      )}
    </View>
  );
}

function SegmentButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useAppMaterialColors();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.segmentButton,
        active && { backgroundColor: colors.secondaryContainer },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text
        style={[
          styles.segmentLabel,
          { color: active ? colors.onSecondaryContainer : colors.onSurfaceVariant },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16 },
  segmented: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  segmentLabel: { fontSize: 14, fontWeight: "600" },
});
