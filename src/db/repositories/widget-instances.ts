import type { SQLiteDatabase } from "expo-sqlite";

import type {
  WidgetContentType,
  WidgetInstance,
  WidgetInstanceOptions,
} from "@/types";

interface WidgetInstanceRow {
  widget_id: number;
  content_type: string;
  options: string | null;
  created_at: string;
}

function mapWidgetInstance(row: WidgetInstanceRow): WidgetInstance {
  return {
    widgetId: row.widget_id,
    contentType: row.content_type as WidgetContentType,
    options: row.options
      ? (JSON.parse(row.options) as WidgetInstanceOptions)
      : {},
    createdAt: row.created_at,
  };
}

/** Looks up one widget instance's persisted config by its native `widgetId`. */
export async function getWidgetInstance(
  db: SQLiteDatabase,
  widgetId: number
): Promise<WidgetInstance | null> {
  const row = await db.getFirstAsync<WidgetInstanceRow>(
    "SELECT * FROM widget_instances WHERE widget_id = ?",
    widgetId
  );
  return row ? mapWidgetInstance(row) : null;
}

export interface UpsertWidgetInstanceInput {
  widgetId: number;
  contentType: WidgetContentType;
  options: WidgetInstanceOptions;
}

/**
 * Insert-or-replace, keyed by the native Android `widgetId` (the table's
 * primary key — see `002_widgets.ts`). Reconfiguring an existing widget
 * (long-press → configure) overwrites its previous content_type/options in
 * place rather than creating a second row; `created_at` is left untouched
 * on an update since it isn't in the `SET` clause.
 */
export async function upsertWidgetInstance(
  db: SQLiteDatabase,
  input: UpsertWidgetInstanceInput
): Promise<WidgetInstance> {
  await db.runAsync(
    `INSERT INTO widget_instances (widget_id, content_type, options)
     VALUES (?, ?, ?)
     ON CONFLICT(widget_id) DO UPDATE SET
       content_type = excluded.content_type,
       options = excluded.options`,
    [input.widgetId, input.contentType, JSON.stringify(input.options)]
  );
  const instance = await getWidgetInstance(db, input.widgetId);
  if (!instance) {
    throw new Error("upsertWidgetInstance: failed to load row after insert");
  }
  return instance;
}

/** Hard delete. Called from the task handler's `WIDGET_DELETED` case so a
 * removed home-screen widget doesn't leave an orphaned config row behind. */
export async function deleteWidgetInstance(
  db: SQLiteDatabase,
  widgetId: number
): Promise<void> {
  await db.runAsync("DELETE FROM widget_instances WHERE widget_id = ?", widgetId);
}
