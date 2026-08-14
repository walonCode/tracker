import { StyleSheet, Switch, View } from "react-native";

import { useAppMaterialColors } from "@/theme/material-colors";

import type { FieldInputProps } from "./types";

/** Toggle for `type: "boolean"` fields. */
export function BooleanField({ value, onChange }: FieldInputProps) {
  const colors = useAppMaterialColors();

  return (
    <View style={styles.row}>
      <Switch
        value={value.valueBoolean ?? false}
        onValueChange={(next) => onChange({ ...value, valueBoolean: next })}
        trackColor={{ true: colors.primary, false: colors.outlineVariant }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start" },
});
