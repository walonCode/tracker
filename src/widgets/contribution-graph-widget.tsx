'use no memo';
// `app.json`'s `experiments.reactCompiler: true` makes React Compiler try to
// auto-memoize every component by inserting hook calls — but widget
// primitives (`FlexWidget`/`TextWidget`) render headlessly, with no React
// tree and no hooks allowed at all (per the package's widget-design docs).
// The directive above opts this file out of that memoization so it doesn't
// crash with an "Invalid hook call" error.

import {
  FlexWidget,
  TextWidget,
  type ColorProp,
  type HexColor,
} from "react-native-android-widget";

import { clamp01, type ContributionGridCell } from "@/lib/contribution-graph";

import type { ContributionGraphWidgetData } from "./widget-data";

export interface ContributionGraphWidgetProps {
  data: ContributionGraphWidgetData;
}

const BACKGROUND: HexColor = "#1C1B1F";
const ON_SURFACE_VARIANT: HexColor = "#CAC4D0";
const EMPTY_COLOR: HexColor = "#2A2A2E";
const SECONDARY_COLOR: HexColor = "#F5C518";
// Fill color's RGB channels, blended with `intensity.primary` as alpha via
// `rgba()` — the widget-primitive equivalent of the in-app Skia
// `ContributionGraph`'s `opacity={primary}` on a solid `fillColor` rect (see
// `src/components/contribution-graph/index.tsx`), since `FlexWidget` has no
// separate opacity prop.
const FILL_R = 57;
const FILL_G = 211;
const FILL_B = 83;

const CELL_SIZE = 9;
const CELL_GAP = 2;
const CELL_RADIUS = 2;
const SECONDARY_DOT_SIZE = 4;

function fillColorForIntensity(primary: number): ColorProp {
  const clamped = clamp01(primary);
  if (clamped <= 0) return EMPTY_COLOR;
  return `rgba(${FILL_R}, ${FILL_G}, ${FILL_B}, ${clamped})`;
}

function GridCell({ cell }: { cell: ContributionGridCell }) {
  return (
    <FlexWidget
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        marginBottom: CELL_GAP,
        borderRadius: CELL_RADIUS,
        backgroundColor: fillColorForIntensity(cell.intensity?.primary ?? 0),
        justifyContent: "flex-end",
        alignItems: "flex-end",
      }}
    >
      {cell.intensity?.secondary ? (
        <FlexWidget
          style={{
            width: SECONDARY_DOT_SIZE,
            height: SECONDARY_DOT_SIZE,
            borderRadius: SECONDARY_DOT_SIZE / 2,
            backgroundColor: SECONDARY_COLOR,
          }}
        />
      ) : null}
    </FlexWidget>
  );
}

/**
 * Home-screen widget: a compact contribution grid for one tracker (or the
 * "all trackers" aggregate), reusing the exact same `ContributionGridCell[][]`
 * shape and fard-brightness/sunnah-dot rule the in-app Skia
 * `ContributionGraph` renders — just laid out with `FlexWidget`/`TextWidget`
 * primitives instead of a Canvas, since Skia can't run in this headless
 * context. Tapping the widget opens the app (`clickAction="OPEN_APP"`).
 */
export function ContributionGraphWidget({ data }: ContributionGraphWidgetProps) {
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
      accessibilityLabel={`${data.title} contribution graph widget`}
    >
      <TextWidget
        text={data.title}
        truncate="END"
        maxLines={1}
        style={{ fontSize: 12, color: ON_SURFACE_VARIANT, fontWeight: "600" }}
      />
      <FlexWidget style={{ flexDirection: "row", marginTop: 8 }}>
        {data.grid.map((column, columnIndex) => (
          <FlexWidget
            key={columnIndex}
            style={{
              flexDirection: "column",
              marginRight: columnIndex === data.grid.length - 1 ? 0 : CELL_GAP,
            }}
          >
            {column.map((cell) => (
              <GridCell key={cell.date} cell={cell} />
            ))}
          </FlexWidget>
        ))}
      </FlexWidget>
    </FlexWidget>
  );
}
