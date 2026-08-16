import type { WidgetTaskHandlerProps } from "react-native-android-widget";

import { getDb } from "@/db/client";
import { deleteWidgetInstance, getWidgetInstance } from "@/db/repositories";
import type { WidgetContentType, WidgetInstanceOptions } from "@/types";

import { ContributionGraphWidget } from "./contribution-graph-widget";
import { ProjectTimeWidget } from "./project-time-widget";
import {
  fetchContributionGraphWidgetData,
  fetchProjectTimeWidgetData,
} from "./widget-data";

// Falls back to the native widget's own name (see `app.json`'s
// `react-native-android-widget` plugin config) when a widget instance has
// no `widget_instances` row yet — exactly the "WIDGET_ADDED fires before
// configuration finishes" case the package's make-widget-configurable docs
// call out: with `widgetFeatures: 'reconfigurable'`, `WIDGET_ADDED` can run
// before the user finishes the configuration screen, so this handler needs
// a sane default to draw immediately; the configuration screen's own
// `renderWidget` call then overwrites it once the user saves.
const WIDGET_NAME_TO_CONTENT_TYPE: Record<string, WidgetContentType> = {
  ContributionGraph: "contribution_graph",
  ProjectTime: "project_time",
};

async function renderCurrentContent(props: WidgetTaskHandlerProps): Promise<void> {
  const { widgetInfo } = props;
  const db = await getDb();
  const stored = await getWidgetInstance(db, widgetInfo.widgetId);
  const contentType: WidgetContentType =
    stored?.contentType ??
    WIDGET_NAME_TO_CONTENT_TYPE[widgetInfo.widgetName] ??
    "contribution_graph";
  const options: WidgetInstanceOptions = stored?.options ?? {};

  if (contentType === "project_time") {
    const data = await fetchProjectTimeWidgetData(options);
    props.renderWidget(<ProjectTimeWidget data={data} />);
  } else {
    const data = await fetchContributionGraphWidgetData(options);
    props.renderWidget(<ContributionGraphWidget data={data} />);
  }
}

/**
 * Headless task handler for both home-screen widgets (`ContributionGraph`
 * and `ProjectTime`, see `app.json`). Registered once from the root
 * `index.js` via `registerWidgetTaskHandler`. Runs with no React tree and
 * no foreground app process — Android invokes this directly (e.g. on
 * `updatePeriodMillis`, or after a force-stop on the next home-screen
 * refresh) — so it reads straight from SQLite (`getDb`) and the pure
 * intensity/aggregation helpers in `@/lib/contribution-graph` and
 * `./widget-data`, then hands back plain widget-primitive JSX via
 * `props.renderWidget`. No separate sync/cache layer, per the brief.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  switch (props.widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED":
      await renderCurrentContent(props);
      break;

    case "WIDGET_DELETED": {
      const db = await getDb();
      await deleteWidgetInstance(db, props.widgetInfo.widgetId);
      break;
    }

    case "WIDGET_CLICK":
      // Both widgets' root is `clickAction="OPEN_APP"`, a special value the
      // library handles natively without ever emitting `WIDGET_CLICK` (see
      // the package's handling-clicks docs) — nothing to do here.
      break;

    default:
      break;
  }
}
