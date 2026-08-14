import { StyleSheet, TextInput } from "react-native";

import { useAppMaterialColors } from "@/theme/material-colors";

import type { FieldInputProps } from "./types";

/** Free-text input for `type: "text"` fields. */
export function TextField({ field, value, onChange }: FieldInputProps) {
  const colors = useAppMaterialColors();

  return (
    <TextInput
      style={[
        styles.input,
        { borderColor: colors.outline, color: colors.onSurface },
      ]}
      placeholder={field.label}
      placeholderTextColor={colors.onSurfaceVariant}
      value={value.valueText ?? ""}
      onChangeText={(next) => onChange({ ...value, valueText: next })}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
});
