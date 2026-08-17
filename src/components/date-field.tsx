import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { isSameLocalDay, addLocalDays } from "@/lib/dates";
import { useAppMaterialColors } from "@/theme/material-colors";

export interface DateFieldProps {
  value: Date;
  onChange: (date: Date) => void;
  /** Defaults to "today" — pass to allow future dates if ever needed. */
  maximumDate?: Date;
}

/** "Today" / "Yesterday" / "Mon, Aug 17" (adds the year once it's not the current one). */
function formatDateLabel(date: Date): string {
  const now = new Date();
  if (isSameLocalDay(date, now)) return "Today";
  if (isSameLocalDay(date, addLocalDays(now, -1))) return "Yesterday";
  const includeYear = date.getFullYear() !== now.getFullYear();
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: includeYear ? "numeric" : undefined,
  });
}

/**
 * Tap-to-open date picker used by the log-entry form (backdating a new
 * entry) and the entry editor (moving an existing entry to a different
 * day). Wraps `@expo/ui`'s `DateTimePicker` community shim in the
 * mount-to-open / unmount-to-close pattern its own docs specify for
 * `presentation="dialog"` on Android — it's not a persistently-rendered
 * inline control.
 */
export function DateField({ value, onChange, maximumDate = new Date() }: DateFieldProps) {
  const colors = useAppMaterialColors();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setPickerOpen(true)}
        style={[styles.field, { borderColor: colors.outline }]}
        accessibilityRole="button"
      >
        <Text style={[styles.label, { color: colors.onSurface }]}>{formatDateLabel(value)}</Text>
        <Text style={[styles.change, { color: colors.primary }]}>Change</Text>
      </Pressable>
      {pickerOpen ? (
        <DateTimePicker
          value={value}
          mode="date"
          presentation="dialog"
          maximumDate={maximumDate}
          onValueChange={(_event, date) => {
            setPickerOpen(false);
            onChange(date);
          }}
          onDismiss={() => setPickerOpen(false)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  label: { fontSize: 15, fontWeight: "600" },
  change: { fontSize: 13, fontWeight: "600" },
});
