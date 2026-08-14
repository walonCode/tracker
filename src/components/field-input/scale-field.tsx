import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppMaterialColors } from "@/theme/material-colors";

import type { FieldInputProps } from "./types";

/**
 * Row of tappable number chips for `type: "scale"` fields, spanning
 * `field.config.min`..`field.config.max` inclusive. Falls back to a 1–5
 * range if `config` is somehow missing (shouldn't happen for a
 * field-builder-created scale field, but `config` is nullable on the type).
 */
export function ScaleField({ field, value, onChange }: FieldInputProps) {
  const colors = useAppMaterialColors();
  const min = field.config?.min ?? 1;
  const max = field.config?.max ?? 5;

  const options: number[] = [];
  for (let n = min; n <= max; n++) options.push(n);

  return (
    <View style={styles.row}>
      {options.map((n) => {
        const selected = value.valueNumber === n;
        return (
          <Pressable
            key={n}
            onPress={() => onChange({ ...value, valueNumber: n })}
            style={[
              styles.chip,
              { borderColor: colors.outline },
              selected && {
                backgroundColor: colors.primaryContainer,
                borderColor: colors.primaryContainer,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text
              style={{
                color: selected ? colors.onPrimaryContainer : colors.onSurface,
                fontWeight: "600",
              }}
            >
              {n}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minWidth: 36,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
