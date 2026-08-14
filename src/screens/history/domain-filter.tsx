import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import type { HistoryDomainFilter } from "@/hooks/use-history";
import { DOMAIN_KEYS, DOMAIN_PALETTE } from "@/theme/domain-palette";
import { useAppMaterialColors } from "@/theme/material-colors";

export interface DomainFilterProps {
  value: HistoryDomainFilter;
  onChange: (value: HistoryDomainFilter) => void;
}

interface FilterOption {
  key: HistoryDomainFilter;
  label: string;
  /** `null` for "All" — falls back to the theme's primary color. */
  color: string | null;
}

// "All" first, then the 4 domains in DOMAIN_KEYS's fixed order (daily,
// finance, projects, others) — matches the brief's "All / Daily / Finance /
// Projects / Others" ordering verbatim.
const OPTIONS: FilterOption[] = [
  { key: "all", label: "All", color: null },
  ...DOMAIN_KEYS.map((key) => ({
    key,
    label: DOMAIN_PALETTE[key].label,
    color: DOMAIN_PALETTE[key].color,
  })),
];

/** Horizontal row of filter chips: All / Daily / Finance / Projects / Others. */
export function DomainFilter({ value, onChange }: DomainFilterProps) {
  const colors = useAppMaterialColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {OPTIONS.map((option) => {
        const isSelected = option.key === value;
        const tint = option.color ?? colors.primary;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? tint : colors.surfaceContainerHigh,
                borderColor: tint,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`Filter: ${option.label}`}
          >
            <Text
              style={[
                styles.chipText,
                { color: isSelected ? "#FFFFFF" : tint },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
