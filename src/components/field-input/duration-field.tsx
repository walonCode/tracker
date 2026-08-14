import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { useAppMaterialColors } from "@/theme/material-colors";

import type { FieldInputProps } from "./types";

/**
 * Numeric input for `type: "duration"` fields, stored the same way as
 * `NumberField` (`valueNumber`) but defaulting its unit label to "min" when
 * the field doesn't specify one, since durations are the one field type
 * where a bare unitless number is ambiguous.
 */
export function DurationField({ field, value, onChange }: FieldInputProps) {
  const colors = useAppMaterialColors();
  const [text, setText] = useState(
    value.valueNumber === null ? "" : String(value.valueNumber)
  );

  const handleChangeText = (next: string) => {
    setText(next);
    const trimmed = next.trim();
    if (trimmed === "") {
      onChange({ ...value, valueNumber: null });
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      onChange({ ...value, valueNumber: parsed });
    }
  };

  return (
    <View style={styles.row}>
      <TextInput
        style={[
          styles.input,
          { borderColor: colors.outline, color: colors.onSurface },
        ]}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={colors.onSurfaceVariant}
        value={text}
        onChangeText={handleChangeText}
      />
      <Text style={[styles.unit, { color: colors.onSurfaceVariant }]}>
        {field.unit ?? "min"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  unit: { fontSize: 14 },
});
