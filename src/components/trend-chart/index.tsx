import { Canvas, Circle, Path, Skia } from "@shopify/react-native-skia";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

export interface TrendChartPoint {
  /** Local calendar day, "YYYY-MM-DD". */
  date: string;
  value: number;
}

export interface TrendChartProps {
  data: readonly TrendChartPoint[];
  /** Width of the plotted canvas, in dp. Defaults to 280. */
  width?: number;
  /** Height of the plotted canvas, in dp. Defaults to 100. */
  height?: number;
  /** Line color. */
  color?: string;
  /** Appended (space-separated) after each axis value label, e.g. "$", "min". */
  unit?: string | null;
  /** Color used for the empty-state text and axis labels. */
  labelColor?: string;
}

const DEFAULT_WIDTH = 280;
const DEFAULT_HEIGHT = 100;
const DEFAULT_COLOR = "#1565C0";
const PADDING = 8;
const POINT_RADIUS = 3;

function formatAxisValue(value: number, unit?: string | null): string {
  const rounded = Math.round(value * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return unit ? `${text} ${unit}` : text;
}

/**
 * Simple Skia line chart: a series of `{ date, value }` points, connected in
 * chronological order, with min/max value labels and first/last date labels.
 * Deliberately not as sophisticated as `ContributionGraph` — no grid layout,
 * no gap-filling for missing days (per the task brief, "keep it simple").
 * Points are just connected in date order, so a large gap between two
 * consecutive data points renders as a straight line across it rather than a
 * break — an acceptable simplification for a readable trend line here.
 *
 * A "dumb" renderer like `contribution-graph`'s component: all it does is
 * sort the input and map it to canvas coordinates. Kept inline (no separate
 * `src/lib/` helper) since that mapping is a few lines, not complex enough to
 * warrant splitting out per the brief's guidance.
 */
export function TrendChart({
  data,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  color = DEFAULT_COLOR,
  unit,
  labelColor = "#6B7280",
}: TrendChartProps) {
  const sorted = useMemo(
    () => [...data].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
    [data]
  );

  const plot = useMemo(() => {
    if (sorted.length === 0) return null;

    const values = sorted.map((p) => p.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const span = maxValue - minValue;
    const plotWidth = Math.max(0, width - PADDING * 2);
    const plotHeight = Math.max(0, height - PADDING * 2);

    const points = sorted.map((point, index) => {
      const x =
        sorted.length === 1
          ? PADDING + plotWidth / 2
          : PADDING + (index / (sorted.length - 1)) * plotWidth;
      const normalized = span === 0 ? 0.5 : (point.value - minValue) / span;
      const y = PADDING + (1 - normalized) * plotHeight;
      return { x, y };
    });

    const path = Skia.Path.Make();
    points.forEach((p, index) => {
      if (index === 0) path.moveTo(p.x, p.y);
      else path.lineTo(p.x, p.y);
    });

    return { path, points, minValue, maxValue };
  }, [sorted, width, height]);

  if (!plot) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={[styles.emptyText, { color: labelColor }]}>No data yet</Text>
      </View>
    );
  }

  const firstDate = sorted[0].date;
  const lastDate = sorted[sorted.length - 1].date;

  return (
    <View style={{ width }}>
      <Canvas style={{ width, height }}>
        <Path
          path={plot.path}
          style="stroke"
          strokeWidth={2}
          color={color}
          strokeJoin="round"
          strokeCap="round"
        />
        {plot.points.length === 1 ? (
          <Circle cx={plot.points[0].x} cy={plot.points[0].y} r={POINT_RADIUS} color={color} />
        ) : null}
      </Canvas>
      <View style={styles.axisRow}>
        <Text style={[styles.axisLabel, { color: labelColor }]}>
          {formatAxisValue(plot.minValue, unit)}
        </Text>
        <Text style={[styles.axisLabel, { color: labelColor }]}>
          {formatAxisValue(plot.maxValue, unit)}
        </Text>
      </View>
      <View style={styles.axisRow}>
        <Text style={[styles.dateLabel, { color: labelColor }]}>{firstDate}</Text>
        {lastDate !== firstDate ? (
          <Text style={[styles.dateLabel, { color: labelColor }]}>{lastDate}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 13,
  },
  axisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  axisLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  dateLabel: {
    fontSize: 10,
  },
});
