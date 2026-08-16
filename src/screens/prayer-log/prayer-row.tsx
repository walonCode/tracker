import { StyleSheet, Switch, Text, View } from "react-native";

import type { MaterialColors } from "@/theme/material-colors";

export interface PrayerRowProps {
  /** Cosmetic heading only (e.g. "Fajr") — never used for field association. */
  heading: string;
  fardValue: boolean;
  onFardChange: (next: boolean) => void;
  sunnahValue: boolean;
  onSunnahChange: (next: boolean) => void;
  colors: MaterialColors;
}

/**
 * One fixed row of the prayer-log form: a prayer heading plus its Fard and
 * Sunnah toggles. Plain React Native (`Switch`), matching the precedent set
 * by `src/components/field-input/boolean-field.tsx` and
 * `src/screens/add/log-entry-form.tsx` rather than `@expo/ui` — see the
 * task report for why.
 */
export function PrayerRow({
  heading,
  fardValue,
  onFardChange,
  sunnahValue,
  onSunnahChange,
  colors,
}: PrayerRowProps) {
  return (
    <View style={[styles.card, { borderColor: colors.outlineVariant }]}>
      <Text style={[styles.heading, { color: colors.onSurface }]}>{heading}</Text>
      <ToggleLine label="Fard" value={fardValue} onValueChange={onFardChange} colors={colors} />
      <ToggleLine
        label="Sunnah"
        value={sunnahValue}
        onValueChange={onSunnahChange}
        colors={colors}
      />
    </View>
  );
}

interface ToggleLineProps {
  label: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  colors: MaterialColors;
}

function ToggleLine({ label, value, onValueChange, colors }: ToggleLineProps) {
  return (
    <View style={styles.toggleLine}>
      <Text style={[styles.toggleLabel, { color: colors.onSurfaceVariant }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.primary, false: colors.outlineVariant }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  heading: {
    fontSize: 16,
    fontWeight: "700",
  },
  toggleLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLabel: {
    fontSize: 14,
  },
});
