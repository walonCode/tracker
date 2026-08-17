import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppMaterialColors } from "@/theme/material-colors";

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * Shared pill-style segmented control (two-plus mutually exclusive modes),
 * e.g. Add's Log Entry/New Tracker toggle and Insights' History/Reports
 * toggle. Generic over a string union `T` so each call site keeps its own
 * mode type instead of stringly-typed values leaking across screens.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const colors = useAppMaterialColors();

  return (
    <View style={[styles.track, { backgroundColor: colors.surfaceContainerHigh }]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && { backgroundColor: colors.surface }]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[
                styles.label,
                { color: active ? colors.primary : colors.onSurfaceVariant },
                active && styles.labelActive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: "center",
  },
  label: { fontSize: 14, fontWeight: "600" },
  labelActive: { fontWeight: "700" },
});
