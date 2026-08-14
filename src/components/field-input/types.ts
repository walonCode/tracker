import type { TrackerField } from "@/types";

/**
 * Draft value for a single field's input, shaped like the repository's
 * `CreateEntryValueInput` minus `fieldId` (the caller already knows which
 * field it's for from context) — a value for exactly one of `valueNumber` /
 * `valueText` / `valueBoolean` is set depending on the field's `type`, the
 * rest stay `null`.
 */
export interface FieldDraftValue {
  valueNumber: number | null;
  valueText: string | null;
  valueBoolean: boolean | null;
}

export function emptyFieldDraftValue(): FieldDraftValue {
  return { valueNumber: null, valueText: null, valueBoolean: null };
}

export interface FieldInputProps {
  field: TrackerField;
  value: FieldDraftValue;
  onChange: (value: FieldDraftValue) => void;
}
