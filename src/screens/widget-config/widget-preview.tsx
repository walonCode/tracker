import { StyleSheet, Text, View } from "react-native";

import { clamp01 } from "@/lib/contribution-graph";

import type { ContributionGraphWidgetData, ProjectTimeWidgetData } from "@/widgets/widget-data";

/**
 * Plain-RN mirrors of the two actual home-screen widgets
 * (`src/widgets/contribution-graph-widget.tsx` / `project-time-widget.tsx`),
 * matching their layout and colors so this screen can show a live preview.
 * The real widgets render via `react-native-android-widget`'s
 * `FlexWidget`/`TextWidget` — headless primitives serialized to native
 * `RemoteViews`, not actual React Native views — so they can't be mounted
 * inside this (perfectly ordinary) config screen directly. These are a
 * second, deliberately-kept-in-sync implementation for preview purposes
 * only; the real widgets remain the source of truth for what actually
 * ships to the home screen.
 */

const WIDGET_BACKGROUND = "#1C1B1F";
const ON_SURFACE = "#E6E1E5";
const ON_SURFACE_VARIANT = "#CAC4D0";
const EMPTY_COLOR = "#2A2A2E";
const SECONDARY_COLOR = "#F5C518";
const FILL_COLOR = "#39D353";
const PROJECT_ACCENT = "#208AEF";

const CELL_SIZE = 10;
const CELL_GAP = 3;

export function ContributionGraphPreview({ data }: { data: ContributionGraphWidgetData }) {
  return (
    <View style={[styles.card, styles.graphCard]}>
      <Text style={styles.title} numberOfLines={1}>
        {data.title}
      </Text>
      <View style={styles.graphRow}>
        {data.grid.map((column, columnIndex) => (
          <View key={columnIndex} style={styles.graphColumn}>
            {column.map((cell) => {
              const primary = clamp01(cell.intensity?.primary ?? 0);
              return (
                <View
                  key={cell.date}
                  style={[
                    styles.graphCell,
                    {
                      backgroundColor: primary > 0 ? FILL_COLOR : EMPTY_COLOR,
                      opacity: primary > 0 ? primary : 1,
                    },
                  ]}
                >
                  {cell.intensity?.secondary ? <View style={styles.secondaryDot} /> : null}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

function formatTotal(total: number, unit: string | null): string {
  const rounded = Math.round(total * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return unit ? `${text} ${unit}` : text;
}

export function ProjectTimePreview({ data }: { data: ProjectTimeWidgetData }) {
  const topRows = data.rows.slice(0, 3);
  return (
    <View style={[styles.card, styles.projectCard]}>
      <Text style={styles.title}>Project Time</Text>
      <Text style={styles.projectTotal}>{formatTotal(data.total, data.unit)}</Text>
      <Text style={styles.rangeLabel}>{data.rangeLabel}</Text>
      {topRows.length > 0 ? (
        <View style={styles.projectRows}>
          {topRows.map((row) => (
            <View key={row.title} style={styles.projectRow}>
              <Text style={styles.projectRowTitle} numberOfLines={1}>
                {row.title}
              </Text>
              <Text style={styles.projectRowTotal}>{formatTotal(row.total, row.unit)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyProjects}>No active projects</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: WIDGET_BACKGROUND,
    borderRadius: 16,
    padding: 14,
  },
  graphCard: { minHeight: 108 },
  projectCard: { minHeight: 108 },
  title: {
    fontSize: 12,
    fontWeight: "600",
    color: ON_SURFACE_VARIANT,
  },
  graphRow: {
    flexDirection: "row",
    marginTop: 10,
  },
  graphColumn: {
    flexDirection: "column",
    marginRight: CELL_GAP,
  },
  graphCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    marginBottom: CELL_GAP,
    borderRadius: 2,
    alignItems: "flex-end",
    justifyContent: "flex-end",
  },
  secondaryDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: SECONDARY_COLOR,
    margin: 1,
  },
  projectTotal: {
    fontSize: 26,
    fontWeight: "700",
    color: PROJECT_ACCENT,
    marginTop: 4,
  },
  rangeLabel: {
    fontSize: 11,
    color: ON_SURFACE_VARIANT,
    marginTop: 2,
  },
  projectRows: { marginTop: 8, gap: 4 },
  projectRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  projectRowTitle: { fontSize: 12, color: ON_SURFACE, flex: 1 },
  projectRowTotal: { fontSize: 12, color: ON_SURFACE_VARIANT },
  emptyProjects: { fontSize: 12, color: ON_SURFACE_VARIANT, marginTop: 8 },
});
