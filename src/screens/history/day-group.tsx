import { StyleSheet, Text, View } from "react-native";

import { diffInLocalDays, parseLocalDateKey, todayLocalDateKey } from "@/lib/dates";
import { useAppMaterialColors } from "@/theme/material-colors";

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const MONTH_DAY_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});
const YEAR_FORMATTER = new Intl.DateTimeFormat(undefined, { year: "numeric" });

/**
 * "Today" / "Yesterday" / "Wed, Aug 12" (adds the year only when it isn't
 * the current one) for a "YYYY-MM-DD" section date.
 */
export function formatDayGroupLabel(date: string): string {
  const parsed = parseLocalDateKey(date);
  const today = parseLocalDateKey(todayLocalDateKey());
  const diff = diffInLocalDays(today, parsed);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";

  const weekday = WEEKDAY_FORMATTER.format(parsed);
  const monthDay = MONTH_DAY_FORMATTER.format(parsed);
  const sameYear = parsed.getFullYear() === today.getFullYear();
  return sameYear ? `${weekday}, ${monthDay}` : `${weekday}, ${monthDay}, ${YEAR_FORMATTER.format(parsed)}`;
}

export interface DayGroupHeaderProps {
  /** "YYYY-MM-DD", device-local. */
  date: string;
  /** True when this is the day a deep-link (`?date=`) landed on. */
  highlighted?: boolean;
}

/** Sticky section header for one day's group of entries in the History list. */
export function DayGroupHeader({ date, highlighted = false }: DayGroupHeaderProps) {
  const colors = useAppMaterialColors();
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: highlighted ? colors.secondaryContainer : colors.surface,
          borderBottomColor: colors.outlineVariant,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: highlighted ? colors.onSecondaryContainer : colors.onSurface },
        ]}
      >
        {formatDayGroupLabel(date)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
