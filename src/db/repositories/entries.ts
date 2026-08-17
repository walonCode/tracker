import type { SQLiteDatabase } from "expo-sqlite";

import type { EntryWithValues, FieldType, TrackerFieldConfig } from "@/types";

interface EntryJoinRow {
  id: number;
  tracker_id: number;
  occurred_at: string;
  local_date: string;
  note: string | null;
  routine_log_id: number | null;
  created_at: string;
  ev_id: number | null;
  ev_field_id: number | null;
  ev_value_number: number | null;
  ev_value_text: string | null;
  ev_value_boolean: number | null;
  tf_id: number | null;
  tf_tracker_id: number | null;
  tf_name: string | null;
  tf_label: string | null;
  tf_type: string | null;
  tf_unit: string | null;
  tf_config: string | null;
  tf_sort_order: number | null;
  tf_created_at: string | null;
}

// LEFT JOINs so an entry with zero values (shouldn't normally happen, but
// isn't invalid per-schema) still comes back as an entry with values: [].
const ENTRY_WITH_VALUES_QUERY = `
  SELECT
    e.id, e.tracker_id, e.occurred_at, e.local_date, e.note, e.routine_log_id, e.created_at,
    ev.id AS ev_id, ev.field_id AS ev_field_id, ev.value_number AS ev_value_number,
    ev.value_text AS ev_value_text, ev.value_boolean AS ev_value_boolean,
    tf.id AS tf_id, tf.tracker_id AS tf_tracker_id, tf.name AS tf_name, tf.label AS tf_label,
    tf.type AS tf_type, tf.unit AS tf_unit, tf.config AS tf_config,
    tf.sort_order AS tf_sort_order, tf.created_at AS tf_created_at
  FROM entries e
  LEFT JOIN entry_values ev ON ev.entry_id = e.id
  LEFT JOIN tracker_fields tf ON tf.id = ev.field_id
`;

function groupEntryRows(rows: EntryJoinRow[]): EntryWithValues[] {
  const order: number[] = [];
  const map = new Map<number, EntryWithValues>();

  for (const row of rows) {
    let entry = map.get(row.id);
    if (!entry) {
      entry = {
        id: row.id,
        trackerId: row.tracker_id,
        occurredAt: row.occurred_at,
        localDate: row.local_date,
        note: row.note,
        routineLogId: row.routine_log_id,
        createdAt: row.created_at,
        values: [],
      };
      map.set(row.id, entry);
      order.push(row.id);
    }

    if (row.ev_id !== null && row.tf_id !== null) {
      entry.values.push({
        id: row.ev_id,
        entryId: row.id,
        fieldId: row.ev_field_id as number,
        valueNumber: row.ev_value_number,
        valueText: row.ev_value_text,
        valueBoolean:
          row.ev_value_boolean === null ? null : row.ev_value_boolean === 1,
        field: {
          id: row.tf_id,
          trackerId: row.tf_tracker_id as number,
          name: row.tf_name as string,
          label: row.tf_label as string,
          type: row.tf_type as FieldType,
          unit: row.tf_unit,
          config: row.tf_config
            ? (JSON.parse(row.tf_config) as TrackerFieldConfig)
            : null,
          sortOrder: row.tf_sort_order as number,
          createdAt: row.tf_created_at as string,
        },
      });
    }
  }

  return order.map((id) => map.get(id) as EntryWithValues);
}

export interface CreateEntryValueInput {
  fieldId: number;
  valueNumber?: number | null;
  valueText?: string | null;
  valueBoolean?: boolean | null;
}

export interface CreateEntryInput {
  trackerId: number;
  /** ISO-8601 instant. */
  occurredAt: string;
  /** 'YYYY-MM-DD', device-local, derived at write time by the caller. */
  localDate: string;
  note?: string | null;
  routineLogId?: number | null;
  values: CreateEntryValueInput[];
}

function toSqliteBoolean(value: boolean | null | undefined): number | null {
  if (value === undefined || value === null) return null;
  return value ? 1 : 0;
}

/** Inserts an entry and all of its entry_values as a single transaction. */
export async function createEntry(
  db: SQLiteDatabase,
  input: CreateEntryInput
): Promise<EntryWithValues> {
  let entryId: number | null = null;

  await db.withTransactionAsync(async () => {
    const entryResult = await db.runAsync(
      `INSERT INTO entries (tracker_id, occurred_at, local_date, note, routine_log_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        input.trackerId,
        input.occurredAt,
        input.localDate,
        input.note ?? null,
        input.routineLogId ?? null,
      ]
    );
    entryId = entryResult.lastInsertRowId;

    for (const value of input.values) {
      await db.runAsync(
        `INSERT INTO entry_values (entry_id, field_id, value_number, value_text, value_boolean)
         VALUES (?, ?, ?, ?, ?)`,
        [
          entryId,
          value.fieldId,
          value.valueNumber ?? null,
          value.valueText ?? null,
          toSqliteBoolean(value.valueBoolean),
        ]
      );
    }
  });

  if (entryId === null) throw new Error("createEntry: transaction did not run");
  const entry = await getEntryWithValues(db, entryId);
  if (!entry) throw new Error("createEntry: failed to load row after insert");
  return entry;
}

/** Replaces all entry_values for an existing entry (e.g. editing an entry). */
export async function replaceEntryValues(
  db: SQLiteDatabase,
  entryId: number,
  values: CreateEntryValueInput[]
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM entry_values WHERE entry_id = ?", entryId);
    for (const value of values) {
      await db.runAsync(
        `INSERT INTO entry_values (entry_id, field_id, value_number, value_text, value_boolean)
         VALUES (?, ?, ?, ?, ?)`,
        [
          entryId,
          value.fieldId,
          value.valueNumber ?? null,
          value.valueText ?? null,
          toSqliteBoolean(value.valueBoolean),
        ]
      );
    }
  });
}

export async function getEntryWithValues(
  db: SQLiteDatabase,
  entryId: number
): Promise<EntryWithValues | null> {
  const rows = await db.getAllAsync<EntryJoinRow>(
    `${ENTRY_WITH_VALUES_QUERY} WHERE e.id = ? ORDER BY tf.sort_order ASC, tf.id ASC`,
    entryId
  );
  const [entry] = groupEntryRows(rows);
  return entry ?? null;
}

export async function getEntriesForDate(
  db: SQLiteDatabase,
  localDate: string
): Promise<EntryWithValues[]> {
  const rows = await db.getAllAsync<EntryJoinRow>(
    `${ENTRY_WITH_VALUES_QUERY} WHERE e.local_date = ?
     ORDER BY e.occurred_at ASC, e.id ASC, tf.sort_order ASC, tf.id ASC`,
    localDate
  );
  return groupEntryRows(rows);
}

export async function getEntriesForDateRange(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string
): Promise<EntryWithValues[]> {
  const rows = await db.getAllAsync<EntryJoinRow>(
    `${ENTRY_WITH_VALUES_QUERY} WHERE e.local_date BETWEEN ? AND ?
     ORDER BY e.local_date ASC, e.occurred_at ASC, e.id ASC, tf.sort_order ASC, tf.id ASC`,
    [startDate, endDate]
  );
  return groupEntryRows(rows);
}

export interface GetEntriesForTrackerOptions {
  limit?: number;
}

export async function getEntriesForTracker(
  db: SQLiteDatabase,
  trackerId: number,
  options: GetEntriesForTrackerOptions = {}
): Promise<EntryWithValues[]> {
  // LIMIT can't be applied directly to the joined query (it would cut off
  // mid-entry, truncating a multi-value entry's rows). Resolve the target
  // entry ids first, then fetch full joined rows for exactly those ids.
  const limitClause = options.limit ? `LIMIT ${Number(options.limit)}` : "";
  const idRows = await db.getAllAsync<{ id: number }>(
    `SELECT id FROM entries WHERE tracker_id = ? ORDER BY occurred_at DESC, id DESC ${limitClause}`,
    trackerId
  );
  if (idRows.length === 0) return [];

  const ids = idRows.map((r) => r.id);
  const placeholders = ids.map(() => "?").join(", ");
  const rows = await db.getAllAsync<EntryJoinRow>(
    `${ENTRY_WITH_VALUES_QUERY} WHERE e.id IN (${placeholders})
     ORDER BY e.occurred_at DESC, e.id DESC, tf.sort_order ASC, tf.id ASC`,
    ids
  );
  return groupEntryRows(rows);
}

export async function updateEntryNote(
  db: SQLiteDatabase,
  entryId: number,
  note: string | null
): Promise<void> {
  await db.runAsync("UPDATE entries SET note = ? WHERE id = ?", [note, entryId]);
}

/** Moves an existing entry to a different occurred_at/local_date (e.g. backdating). */
export async function updateEntryDate(
  db: SQLiteDatabase,
  entryId: number,
  occurredAt: string,
  localDate: string
): Promise<void> {
  await db.runAsync(
    "UPDATE entries SET occurred_at = ?, local_date = ? WHERE id = ?",
    [occurredAt, localDate, entryId]
  );
}

/** Hard delete. Cascades to entry_values. */
export async function deleteEntry(db: SQLiteDatabase, entryId: number): Promise<void> {
  await db.runAsync("DELETE FROM entries WHERE id = ?", entryId);
}
