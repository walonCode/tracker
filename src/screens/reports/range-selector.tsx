import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ReportRange } from "@/hooks/use-reports-data";
import { useAppMaterialColors } from "@/theme/material-colors";

export interface RangeSelectorProps {
  value: ReportRange;
  onChange: (range: ReportRange) => void;
}

const OPTIONS: { key: ReportRange; label: string }[] = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "all", label: "All time" },
];

/**
 * Week / Month / All-time segmented control. Plain React Native, matching
 * the existing precedent in `src/screens/add/index.tsx` (a 2-way plain-RN
 * segmented control) — `@expo/ui/jetpack-compose`'s `SegmentedButton` would
 * work too, but is Android-only and would require a platform split for a
 * control this simple; plain RN keeps this component's behavior identical
 * across iOS/Android/web with no split needed.
 */
export function RangeSelector({ value, onChange }: RangeSelectorProps) {
  const colors = useAppMaterialColors();

  return (
    <View style={[styles.container, { borderColor: colors.outlineVariant }]}>
      {OPTIONS.map((option) => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={[styles.button, active && { backgroundColor: colors.secondaryContainer }]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[
                styles.label,
                { color: active ? colors.onSecondaryContainer : colors.onSurfaceVariant },
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
  container: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  button: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
});
