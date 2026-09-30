import { StyleSheet, TextInput as NativeInput, View } from "react-native";
import { IconButton } from "react-native-paper";

import { useAppTheme } from "@/theme";

interface AmountStepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Minus, a large number you can also type, plus. Out-of-range values clamp. */
export function AmountStepper({ value, min, max, onChange, label }: AmountStepperProps) {
  const theme = useAppTheme();
  return (
    <View style={styles.row}>
      <IconButton
        icon="minus"
        mode="outlined"
        size={20}
        accessibilityLabel={`Decrease ${label}`}
        disabled={value <= min}
        onPress={() => onChange(clamp(value - 1, min, max))}
      />
      <NativeInput
        accessibilityLabel={label}
        keyboardType="number-pad"
        selectTextOnFocus
        value={String(value)}
        onChangeText={(text) => {
          const digits = text.replace(/\D/g, "");
          onChange(clamp(digits === "" ? min : Number(digits), min, max));
        }}
        maxLength={String(max).length}
        style={[styles.value, { color: theme.colors.onSurface, borderBottomColor: theme.colors.outlineVariant }]}
      />
      <IconButton
        icon="plus"
        mode="outlined"
        size={20}
        accessibilityLabel={`Increase ${label}`}
        disabled={value >= max}
        onPress={() => onChange(clamp(value + 1, min, max))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  value: {
    minWidth: 56,
    fontSize: 24,
    fontWeight: "500",
    textAlign: "center",
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
