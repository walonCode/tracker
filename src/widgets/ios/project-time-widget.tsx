import { HStack, Text, VStack } from "@expo/ui/swift-ui";
import { font, foregroundStyle, padding } from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

import type { ProjectTimeWidgetData } from "../widget-data";

/** How many per-project rows fit before the widget gets too cramped. */
function maxRowsFor(family: WidgetEnvironment["widgetFamily"]): number {
  if (family === "systemSmall") return 0;
  if (family === "systemMedium") return 2;
  return 4;
}

/**
 * iOS home-screen widget mirroring the Android "Project Time" widget: total
 * time logged this range, plus a short per-project breakdown on the larger
 * sizes. Data comes from `fetchProjectTimeWidgetData` via `../ios-sync.ts`,
 * the same aggregation Reports' project-time summary uses.
 */
export const projectTimeWidget = createWidget<ProjectTimeWidgetData>(
  "ProjectTime",
  (props, environment: WidgetEnvironment) => {
    "widget";
    const rows = props.rows.slice(0, maxRowsFor(environment.widgetFamily));

    return (
      <VStack alignment="leading" spacing={6} modifiers={[padding({ all: 12 })]}>
        <Text modifiers={[font({ weight: "semibold", size: 12 }), foregroundStyle("secondary")]}>
          Project time · {props.rangeLabel}
        </Text>
        <Text modifiers={[font({ weight: "bold", size: 22 })]}>
          {props.total}
          {props.unit ? ` ${props.unit}` : ""}
        </Text>
        {rows.map((row) => (
          <HStack key={row.title}>
            <Text modifiers={[font({ size: 12 })]}>{row.title}</Text>
            <Text modifiers={[font({ size: 12 }), foregroundStyle("secondary")]}>
              {row.total}
              {row.unit ? ` ${row.unit}` : ""}
            </Text>
          </HStack>
        ))}
      </VStack>
    );
  }
);
