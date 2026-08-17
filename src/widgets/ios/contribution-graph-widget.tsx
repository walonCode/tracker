import { Circle, HStack, RoundedRectangle, Text, VStack, ZStack } from "@expo/ui/swift-ui";
import { font, foregroundStyle, frame, padding } from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

import type { ContributionGridCell } from "../../lib/contribution-graph";
import type { ContributionGraphWidgetData } from "../widget-data";

const BASE_COLOR = "#208AEF";
const EMPTY_COLOR = "#8E8E9314";
const CELL_SIZE = 11;
const CELL_GAP = 3;

/** Maps a 0..1 fill intensity onto the brand blue's alpha channel, "#RRGGBBAA". */
function intensityColor(primary: number): string {
  if (primary <= 0) return EMPTY_COLOR;
  const alpha = Math.round(40 + primary * 215)
    .toString(16)
    .padStart(2, "0");
  return `${BASE_COLOR}${alpha}`;
}

function GridCell({ cell }: { cell: ContributionGridCell }) {
  const primary = cell.intensity?.primary ?? 0;
  const secondary = cell.intensity?.secondary ?? false;
  return (
    <ZStack alignment="center" modifiers={[frame({ width: CELL_SIZE, height: CELL_SIZE })]}>
      <RoundedRectangle
        cornerRadius={3}
        modifiers={[
          frame({ width: CELL_SIZE, height: CELL_SIZE }),
          foregroundStyle(intensityColor(primary)),
        ]}
      />
      {secondary ? (
        <Circle modifiers={[frame({ width: 4, height: 4 }), foregroundStyle("white")]} />
      ) : null}
    </ZStack>
  );
}

/**
 * iOS home-screen widget mirroring the Android "Contribution Graph" widget.
 * `systemSmall` shows only the most recent weeks (there isn't room for the
 * full grid); `systemMedium`/`systemLarge` show everything the app computed
 * (see `../ios-sync.ts`, which pushes the same data the in-app graph and the
 * Android widget use, via `fetchContributionGraphWidgetData`).
 */
export const contributionGraphWidget = createWidget<ContributionGraphWidgetData>(
  "ContributionGraph",
  (props, environment: WidgetEnvironment) => {
    "widget";
    const maxWeeks = environment.widgetFamily === "systemSmall" ? 8 : props.grid.length;
    const visibleWeeks = props.grid.slice(Math.max(0, props.grid.length - maxWeeks));

    return (
      <VStack alignment="leading" spacing={6} modifiers={[padding({ all: 12 })]}>
        <Text modifiers={[font({ weight: "semibold", size: 12 }), foregroundStyle("secondary")]}>
          {props.title}
        </Text>
        <HStack spacing={CELL_GAP}>
          {visibleWeeks.map((week, weekIndex) => (
            <VStack key={weekIndex} spacing={CELL_GAP}>
              {week.map((cell) => (
                <GridCell key={cell.date} cell={cell} />
              ))}
            </VStack>
          ))}
        </HStack>
      </VStack>
    );
  }
);
