import type { TrackerField } from "@/types";

import { BooleanField } from "./boolean-field";
import { DurationField } from "./duration-field";
import { NumberField } from "./number-field";
import { ScaleField } from "./scale-field";
import { TextField } from "./text-field";
import type { FieldDraftValue } from "./types";

export { emptyFieldDraftValue } from "./types";
export type { FieldDraftValue, FieldInputProps } from "./types";

export interface FieldInputRendererProps {
  field: TrackerField;
  value: FieldDraftValue;
  onChange: (value: FieldDraftValue) => void;
}

/**
 * Dispatches to the right input control for a `TrackerField`'s `type` — one
 * renderer per `FieldType` (`number-field.tsx`, `duration-field.tsx`,
 * `text-field.tsx`, `boolean-field.tsx`, `scale-field.tsx`), all plain React
 * Native (see the task report for why `@expo/ui` wasn't used here).
 */
export function FieldInput({ field, value, onChange }: FieldInputRendererProps) {
  switch (field.type) {
    case "number":
      return <NumberField field={field} value={value} onChange={onChange} />;
    case "duration":
      return <DurationField field={field} value={value} onChange={onChange} />;
    case "text":
      return <TextField field={field} value={value} onChange={onChange} />;
    case "boolean":
      return <BooleanField field={field} value={value} onChange={onChange} />;
    case "scale":
      return <ScaleField field={field} value={value} onChange={onChange} />;
    default: {
      // Exhaustiveness check: if `FieldType` ever grows a new member, this
      // line fails to compile until a renderer is added for it above.
      const exhaustiveCheck: never = field.type;
      return exhaustiveCheck;
    }
  }
}
