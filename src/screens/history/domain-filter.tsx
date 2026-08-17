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

// "All" first, then every domain in DOMAIN_KEYS's fixed order (daily,
// religion, finance, projects, others) — extends the brief's "All / Daily /
// Finance / Projects / Others" ordering with Religion, added later.
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
      style={styles.scrollView}
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
  // `flexGrow: 0` stops this horizontal ScrollView from being stretched to
  // fill its flex-column parent's remaining height (a common RN gotcha —
  // without it, the chips row can end up as tall as whatever vertical space
  // the sibling list below happens to leave, stretching each chip with it
  // since the row's own `alignItems` below has no bound without this).
  scrollView: {
    flexGrow: 0,
  },
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
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
