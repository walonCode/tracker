export type WidgetContentType = "contribution_graph" | "project_time";

/**
 * Per-widget-instance configuration, persisted as JSON in
 * `widget_instances.options` (see `src/db/migrations/002_widgets.ts`). One
 * loose shape shared by both content types — matches the schema's plain
 * `options TEXT` column — rather than a discriminated union; each
 * `src/widgets/widget-data.ts` fetcher only reads the keys relevant to its
 * own `content_type` and ignores the rest.
 */
export interface WidgetInstanceOptions {
  /** contribution_graph only: which tracker to show. Omitted = all trackers, aggregated. */
  trackerId?: number;
  /** project_time only: which single project to show. Omitted = all active projects, summed. */
  projectId?: number;
  /** Both content types: how many trailing days the widget's range covers. */
  rangeDays?: number;
}

export type ContributionGraphWidgetOptions = Pick<
  WidgetInstanceOptions,
  "trackerId" | "rangeDays"
>;

export type ProjectTimeWidgetOptions = Pick<
  WidgetInstanceOptions,
  "projectId" | "rangeDays"
>;

export interface WidgetInstance {
  /** Android's native appWidgetId — the row's primary key. */
  widgetId: number;
  contentType: WidgetContentType;
  options: WidgetInstanceOptions;
  createdAt: string;
}
