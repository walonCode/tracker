'use no memo';
// See the matching note in `contribution-graph-widget.tsx`: this opts the
// file out of React Compiler's auto-memoization, which widget primitives
// (no hooks allowed, no React tree) can't tolerate.

import { FlexWidget, TextWidget, type HexColor } from "react-native-android-widget";

import type { PrayerWidgetData } from "./widget-data";

export interface PrayerWidgetProps {
  data: PrayerWidgetData;
}

const BACKGROUND: HexColor = "#1C1B1F";
const ON_SURFACE_VARIANT: HexColor = "#CAC4D0";
const RELIGION_COLOR: HexColor = "#00695C";
const RELIGION_EMPTY: HexColor = "#33403E";
const SECONDARY_COLOR: HexColor = "#F5C518";

const DOT_SIZE = 26;
const SECONDARY_DOT_SIZE = 6;

function PrayerDot({ label, fardDone, sunnahDone }: { label: string; fardDone: boolean; sunnahDone: boolean }) {
  return (
    <FlexWidget style={{ flexDirection: "column", alignItems: "center" }}>
      <FlexWidget
        style={{
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: DOT_SIZE / 2,
          backgroundColor: fardDone ? RELIGION_COLOR : RELIGION_EMPTY,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {sunnahDone ? (
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
      <TextWidget text={label} style={{ fontSize: 9, color: ON_SURFACE_VARIANT, marginTop: 4 }} />
    </FlexWidget>
  );
}

/**
 * Home-screen widget: today's fard/sunnah status for the single `kind:
 * "prayer"` tracker, one dot per prayer — solid Religion-teal when fard is
 * done, a small yellow dot on top when sunnah is also done, matching the
 * same "fard drives fill, sunnah is a distinct secondary indicator" rule
 * the contribution graph and the in-app prayer log both use. No
 * per-instance options (there's only one prayer tracker and it's always
 * "today", nothing to configure) — see `fetchPrayerWidgetData`.
 */
export function PrayerWidget({ data }: PrayerWidgetProps) {
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
      accessibilityLabel="Prayer widget"
    >
      <FlexWidget style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <TextWidget text="Prayer" style={{ fontSize: 12, color: ON_SURFACE_VARIANT, fontWeight: "600" }} />
        <TextWidget
          text={`${data.fardDone}/${data.total} fard`}
          style={{ fontSize: 12, color: RELIGION_COLOR, fontWeight: "700" }}
        />
      </FlexWidget>
      <FlexWidget style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
        {data.rows.map((row) => (
          <PrayerDot key={row.label} label={row.label} fardDone={row.fardDone} sunnahDone={row.sunnahDone} />
        ))}
      </FlexWidget>
    </FlexWidget>
  );
}
