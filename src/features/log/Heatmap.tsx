import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Text } from "react-native-paper";

import { formatDate, type LocalDate } from "@/domain/dates";
import type { GridCell, ShadeLevel } from "@/domain/heatmap";
import { useAppTheme } from "@/theme";

const GAP = 4;
const SIDE_PADDING = 16;

export type CellValue = { kind: "minutes"; minutes: number; level: ShadeLevel } | { kind: "hit"; hit: boolean };

interface HeatmapProps {
  grid: GridCell[][];
  today: LocalDate;
  valueFor: (date: LocalDate) => CellValue;
  selected: LocalDate | null;
  onSelect: (date: LocalDate | null) => void;
}

/** `#rrggbb` at an opacity, for the four shades of the primary color. */
function withAlpha(hex: string, alpha: number): string {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

const LEVEL_ALPHA = [0, 0.3, 0.55, 0.8, 1];

export function useCellColors() {
  const theme = useAppTheme();
  return {
    empty: theme.colors.surfaceVariant,
    level: (level: ShadeLevel) => (level === 0 ? theme.colors.surfaceVariant : withAlpha(theme.colors.primary, LEVEL_ALPHA[level])),
    outline: theme.colors.outline,
    selected: theme.colors.onSurface,
  };
}

function describe(date: LocalDate, today: LocalDate, value: CellValue, future: boolean): string {
  const day = formatDate(date, today);
  if (future) return `${day}, upcoming`;
  if (value.kind === "hit") return `${day}, ${value.hit ? "limit hit" : "limit missed"}`;
  return `${day}, ${value.minutes} ${value.minutes === 1 ? "minute" : "minutes"}`;
}

/** 12 weeks by 7 days of plain Views, Monday at the top. Tap a day to select it, again to clear. */
export function Heatmap({ grid, today, valueFor, selected, onSelect }: HeatmapProps) {
  const { width } = useWindowDimensions();
  const colors = useCellColors();
  const size = Math.floor((width - SIDE_PADDING * 2 - GAP * (grid.length - 1)) / grid.length);

  return (
    <View style={styles.grid}>
      {grid.map((week) => (
        <View key={week[0].date} style={styles.column}>
          {week.map((cell) => {
            const value = valueFor(cell.date);
            const fill = cell.future
              ? "transparent"
              : value.kind === "hit"
                ? value.hit
                  ? colors.level(4)
                  : colors.empty
                : colors.level(value.level);
            const isSelected = selected === cell.date;
            return (
              <Pressable
                key={cell.date}
                disabled={cell.future}
                onPress={() => onSelect(isSelected ? null : cell.date)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected, disabled: cell.future }}
                accessibilityLabel={describe(cell.date, today, value, cell.future)}
                hitSlop={GAP / 2}
                style={[
                  styles.cell,
                  { width: size, height: size, backgroundColor: fill },
                  cell.future && { borderColor: colors.outline, borderStyle: "dashed", borderWidth: 1 },
                  isSelected && { borderColor: colors.selected, borderWidth: 2 },
                ]}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** Less to More for the overall view; Limit missed and Limit hit per task. */
export function Legend({ perTask }: { perTask: boolean }) {
  const colors = useCellColors();
  const swatch = (color: string) => <View style={[styles.swatch, { backgroundColor: color }]} />;
  if (perTask) {
    return (
      <View style={styles.legend}>
        {swatch(colors.empty)}
        <Text variant="bodySmall">Limit missed</Text>
        {swatch(colors.level(4))}
        <Text variant="bodySmall">Limit hit</Text>
      </View>
    );
  }
  return (
    <View style={styles.legend}>
      <Text variant="bodySmall">Less</Text>
      {([0, 1, 2, 3, 4] as const).map((level) => (
        <View key={level}>{swatch(colors.level(level))}</View>
      ))}
      <Text variant="bodySmall">More</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", gap: GAP, paddingHorizontal: SIDE_PADDING },
  column: { gap: GAP },
  cell: { borderRadius: 3 },
  legend: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "flex-end", paddingHorizontal: SIDE_PADDING },
  swatch: { width: 12, height: 12, borderRadius: 2 },
});
