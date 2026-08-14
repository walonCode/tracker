import type { TrackerField } from "./tracker";

export interface Entry {
  id: number;
  trackerId: number;
  occurredAt: string;
  localDate: string;
  note: string | null;
  routineLogId: number | null;
  createdAt: string;
}

export interface EntryValue {
  id: number;
  entryId: number;
  fieldId: number;
  valueNumber: number | null;
  valueText: string | null;
  valueBoolean: boolean | null;
}

export interface EntryWithValues extends Entry {
  values: (EntryValue & { field: TrackerField })[];
}
