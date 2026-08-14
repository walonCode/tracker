import { Canvas, Circle, Group, RoundedRect } from "@shopify/react-native-skia";
import { useCallback, useMemo } from "react";
import type { GestureResponderEvent } from "react-native";
import { View } from "react-native";

import {
  buildContributionGrid,
  clamp01,
  type ContributionGridCell,
  type DayIntensity,
} from "@/lib/contribution-graph";

export interface ContributionGraphProps {
  /** Day data to render. Order doesn't matter; days are matched by `date`. */
  data: DayIntensity[];
  /** Number of week columns to render. */
  weeks: number;
  /** The day the grid should end on (its week is the last column). Defaults to today. */
  endDate?: Date;
  /** 0 = Sunday-start weeks (default), 1 = Monday-start weeks. */
  weekStartsOn?: 0 | 1;
  /** Side length of each square day cell, in dp. Defaults to 12. */
  cellSize?: number;
  /** Gap between cells, in dp. Defaults to 3. */
  cellGap?: number;
  /** Corner radius of each cell, in dp. Defaults to 3. */
  cellRadius?: number;
  /** Fill color for a day with no data (`primary` 0 / missing). */
  emptyColor?: string;
  /** Base fill color for a day with data; opacity scales with `primary`. */
  fillColor?: string;
  /** Color of the small secondary dot drawn when a cell's `secondary` is true. */
  secondaryColor?: string;
  /** Called with a cell's "YYYY-MM-DD" date when the user taps it. */
  onDayPress?: (date: string) => void;
}

const DEFAULT_CELL_SIZE = 12;
const DEFAULT_CELL_GAP = 3;
const DEFAULT_CELL_RADIUS = 3;
const DEFAULT_EMPTY_COLOR = "#2A2A2E";
const DEFAULT_FILL_COLOR = "#39D353";
const DEFAULT_SECONDARY_COLOR = "#F5C518";

/**
 * GitHub-style contribution graph. A "dumb" Skia renderer: all date-grid
 * math lives in `buildContributionGrid` (src/lib/contribution-graph.ts) —
 * this component only maps the resulting cells to shapes.
 *
 * Brightness comes only from `primary` (fill opacity); `secondary` draws an
 * independent small dot in the corner and never blends into the fill color.
 * This generically implements the prayer tracker's "fard drives brightness,
 * sunnah is a distinct secondary indicator" rule — and any other rule that
 * fits the same `DayIntensity` shape — without this component knowing
 * anything about prayers specifically.
 */
export function ContributionGraph({
  data,
  weeks,
  endDate,
  weekStartsOn,
  cellSize = DEFAULT_CELL_SIZE,
  cellGap = DEFAULT_CELL_GAP,
  cellRadius = DEFAULT_CELL_RADIUS,
  emptyColor = DEFAULT_EMPTY_COLOR,
  fillColor = DEFAULT_FILL_COLOR,
  secondaryColor = DEFAULT_SECONDARY_COLOR,
  onDayPress,
}: ContributionGraphProps) {
  const grid = useMemo(
    () => buildContributionGrid(data, weeks, { endDate, weekStartsOn }),
    [data, weeks, endDate, weekStartsOn]
  );

  const step = cellSize + cellGap;
  const width = Math.max(0, grid.length * step - cellGap);
  const height = grid.length > 0 ? 7 * step - cellGap : 0;

  const secondaryRadius = Math.max(1.5, cellSize * 0.18);
  const secondaryInset = secondaryRadius + Math.max(1, cellSize * 0.08);

  const handleTap = useCallback(
    (event: GestureResponderEvent) => {
      if (!onDayPress) return;
      const cell = locateCell(
        event.nativeEvent.locationX,
        event.nativeEvent.locationY,
        grid,
        step,
        cellSize
      );
      if (cell) onDayPress(cell.date);
    },
    [grid, onDayPress, step, cellSize]
  );

  return (
    <View
      style={{ width, height }}
      onStartShouldSetResponder={() => !!onDayPress}
      onResponderRelease={handleTap}
    >
      <Canvas style={{ width, height }}>
        {grid.map((column) =>
          column.map((cell) => {
            const x = cell.weekIndex * step;
            const y = cell.dayOfWeek * step;
            const primary = clamp01(cell.intensity?.primary ?? 0);
            const hasFill = primary > 0;
            const showSecondary = cell.intensity?.secondary === true;

            return (
              <Group key={cell.date}>
                <RoundedRect
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  r={cellRadius}
                  color={hasFill ? fillColor : emptyColor}
                  opacity={hasFill ? primary : 1}
                />
                {showSecondary ? (
                  <Circle
                    cx={x + cellSize - secondaryInset}
                    cy={y + secondaryInset}
                    r={secondaryRadius}
                    color={secondaryColor}
                  />
                ) : null}
              </Group>
            );
          })
        )}
      </Canvas>
    </View>
  );
}

/** Maps a tap's local (x, y) to the grid cell it landed in, or `null` if it landed in a gap. */
function locateCell(
  x: number,
  y: number,
  grid: ContributionGridCell[][],
  step: number,
  cellSize: number
): ContributionGridCell | null {
  const weekIndex = Math.floor(x / step);
  const dayOfWeek = Math.floor(y / step);
  const column = grid[weekIndex];
  if (!column) return null;
  const cell = column[dayOfWeek];
  if (!cell) return null;

  const xInStep = x - weekIndex * step;
  const yInStep = y - dayOfWeek * step;
  if (xInStep > cellSize || yInStep > cellSize) return null;

  return cell;
}
