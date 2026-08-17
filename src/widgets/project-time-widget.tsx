'use no memo';
// See the matching note in `contribution-graph-widget.tsx`: this opts the
// file out of React Compiler's auto-memoization, which widget primitives
// (no hooks allowed, no React tree) can't tolerate.

import {
  FlexWidget,
  TextWidget,
  type HexColor,
} from "react-native-android-widget";

import type { ProjectTimeWidgetData, ProjectTimeWidgetRow } from "./widget-data";

export interface ProjectTimeWidgetProps {
  data: ProjectTimeWidgetData;
}

const BACKGROUND: HexColor = "#1C1B1F";
const ON_SURFACE: HexColor = "#E6E1E5";
const ON_SURFACE_VARIANT: HexColor = "#CAC4D0";
const ACCENT: HexColor = "#208AEF"; // matches the app's brand blue (app.json splash/icon)
const MAX_ROWS = 3;

function formatTotal(total: number, unit: string | null): string {
  const rounded = Math.round(total * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return unit ? `${text} ${unit}` : text;
}

function ProjectRow({ row }: { row: ProjectTimeWidgetRow }) {
  return (
    <FlexWidget style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
      <FlexWidget style={{ flex: 1 }}>
        <TextWidget
          text={row.title}
          truncate="END"
          maxLines={1}
          style={{ fontSize: 12, color: ON_SURFACE }}
        />
      </FlexWidget>
      <TextWidget
        text={formatTotal(row.total, row.unit)}
        style={{ fontSize: 12, color: ON_SURFACE_VARIANT }}
      />
    </FlexWidget>
  );
}

/**
 * Home-screen widget: total time logged (this instance's configured range)
 * across either one project or all active projects, plus a short
 * per-project breakdown. Field resolution and summation mirror
 * `project-time-summary.tsx` (see `widget-data.ts`), so this total matches
 * Reports' for the same range. Tapping the widget opens the app.
 */
export function ProjectTimeWidget({ data }: ProjectTimeWidgetProps) {
  const topRows = data.rows.slice(0, MAX_ROWS);

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "column",
        padding: 12,
        backgroundColor: BACKGROUND,
        borderRadius: 16,
      }}
      accessibilityLabel="Project time widget"
    >
      <TextWidget text="Project Time" style={{ fontSize: 12, color: ON_SURFACE_VARIANT, fontWeight: "600" }} />
      <TextWidget
        text={formatTotal(data.total, data.unit)}
        style={{ fontSize: 26, color: ACCENT, fontWeight: "700", marginTop: 4 }}
      />
      <TextWidget text={data.rangeLabel} style={{ fontSize: 11, color: ON_SURFACE_VARIANT, marginTop: 2 }} />

      {topRows.length > 0 ? (
        <FlexWidget style={{ flexDirection: "column", marginTop: 8 }}>
          {topRows.map((row) => (
            <ProjectRow key={row.title} row={row} />
          ))}
        </FlexWidget>
      ) : (
        <TextWidget
          text="No active projects"
          style={{ fontSize: 12, color: ON_SURFACE_VARIANT, marginTop: 8 }}
        />
      )}
    </FlexWidget>
  );
}
