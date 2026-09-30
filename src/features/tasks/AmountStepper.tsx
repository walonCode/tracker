import { StyleSheet, View } from "react-native";
import { IconButton, TextInput } from "react-native-paper";

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

/** Minus, a numeric field, plus. The field accepts typing; out-of-range values clamp. */
export function AmountStepper({ value, min, max, onChange, label }: AmountStepperProps) {
  return (
    <View style={styles.row}>
      <IconButton
        icon="minus"
        mode="outlined"
        accessibilityLabel={`Decrease ${label}`}
        disabled={value <= min}
        onPress={() => onChange(clamp(value - 1, min, max))}
      />
      <TextInput
        mode="outlined"
        dense
        style={styles.input}
        accessibilityLabel={label}
        keyboardType="number-pad"
        value={String(value)}
        onChangeText={(text) => {
          const digits = text.replace(/\D/g, "");
          onChange(clamp(digits === "" ? min : Number(digits), min, max));
        }}
        maxLength={String(max).length}
      />
      <IconButton
        icon="plus"
        mode="outlined"
        accessibilityLabel={`Increase ${label}`}
        disabled={value >= max}
        onPress={() => onChange(clamp(value + 1, min, max))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  input: { width: 80, textAlign: "center" },
});
