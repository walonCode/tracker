import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { useAppMaterialColors } from "@/theme/material-colors";

import type { FieldInputProps } from "./types";

/**
 * Plain-text numeric input for `type: "number"` fields. Keeps its own local
 * text state (rather than deriving the displayed string from `value` on
 * every render) so mid-typing states like `"12."` or `"-"` don't get
 * reformatted out from under the user while they're still typing.
 */
export function NumberField({ field, value, onChange }: FieldInputProps) {
  const colors = useAppMaterialColors();
  const [text, setText] = useState(
    value.valueNumber === null ? "" : String(value.valueNumber)
  );

  const handleChangeText = (next: string) => {
    setText(next);
    const trimmed = next.trim();
    if (trimmed === "" || trimmed === "-") {
      onChange({ ...value, valueNumber: null });
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isNaN(parsed)) {
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
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={colors.onSurfaceVariant}
        value={text}
        onChangeText={handleChangeText}
      />
      {field.unit ? (
        <Text style={[styles.unit, { color: colors.onSurfaceVariant }]}>
          {field.unit}
        </Text>
      ) : null}
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
