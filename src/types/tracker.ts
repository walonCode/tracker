export type TrackerFrequency = "daily" | "occasional";
export type TrackerKind = "standard" | "prayer" | "project_time";
export type FieldType = "number" | "duration" | "text" | "boolean" | "scale";

export interface Tracker {
  id: number;
  domainId: number;
  name: string;
  frequency: TrackerFrequency;
  kind: TrackerKind;
  color: string | null;
  icon: string | null;
  archivedAt: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface TrackerFieldConfig {
  min: number;
  max: number;
}

export interface TrackerField {
  id: number;
  trackerId: number;
  name: string;
  label: string;
  type: FieldType;
  unit: string | null;
  config: TrackerFieldConfig | null;
  sortOrder: number;
  /**
   * Not in the brief's verbatim TrackerField snippet, but tracker_fields.created_at
   * exists in the schema and every other row type mirrors its created_at column,
   * so it's included here for consistency. See task-2-report.md for rationale.
   */
  createdAt: string;
}
