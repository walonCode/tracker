import { Circle, HStack, Text, VStack, ZStack } from "@expo/ui/swift-ui";
import { font, foregroundStyle, frame, padding } from "@expo/ui/swift-ui/modifiers";
import { createWidget } from "expo-widgets";

import type { PrayerWidgetData } from "../widget-data";

const RELIGION_COLOR = "#00695C";

/**
 * One prayer's dot: solid fill when fard is done, an outline ring
 * otherwise, with a small independent dot layered on top when sunnah is
 * also done. Mirrors the Android prayer widget's fard-brightness/sunnah-dot
 * split (see `src/lib/contribution-graph.ts`'s "never blended" rule) --
 * sunnah never changes the ring's own fill, it only adds the extra dot.
 */
function PrayerDot({ fardDone, sunnahDone }: { fardDone: boolean; sunnahDone: boolean }) {
  return (
    <ZStack alignment="center" modifiers={[frame({ width: 18, height: 18 })]}>
      <Circle
        modifiers={[
          frame({ width: 18, height: 18 }),
          foregroundStyle(fardDone ? RELIGION_COLOR : "clear"),
        ]}
      />
      {sunnahDone ? (
        <Circle modifiers={[frame({ width: 6, height: 6 }), foregroundStyle("white")]} />
      ) : null}
    </ZStack>
  );
}

/**
 * iOS home-screen widget mirroring the Android "Prayer" widget: today's
 * fard/sunnah status for each of the five daily prayers. Defined as a
 * plain React component -- no hand-written Swift -- per `expo-widgets`
 * (`@expo/ui/swift-ui` primitives compile to a native layout tree; see
 * `../ios-sync.ts` for how this widget's props get pushed from the app).
 */
export const prayerWidget = createWidget<PrayerWidgetData>("Prayer", (props) => {
  "widget";
  return (
    <VStack alignment="leading" spacing={10} modifiers={[padding({ all: 12 })]}>
      <Text modifiers={[font({ weight: "semibold", size: 12 }), foregroundStyle("secondary")]}>
        {props.fardDone}/{props.total} prayers
      </Text>
      <HStack spacing={8}>
        {props.rows.map((row) => (
          <VStack key={row.label} spacing={4} alignment="center">
            <PrayerDot fardDone={row.fardDone} sunnahDone={row.sunnahDone} />
            <Text modifiers={[font({ size: 10 }), foregroundStyle("secondary")]}>
              {row.label.slice(0, 1)}
            </Text>
          </VStack>
        ))}
      </HStack>
    </VStack>
  );
});
