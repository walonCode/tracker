import { router } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { Text } from "react-native-paper";

import type { Goal } from "@/db/types";
import { formatDayMonth, today } from "@/domain/dates";
import { useAppTheme } from "@/theme";

/** The compact goal line at the top of Today; tapping it opens the Goal screen. */
export function GoalCard({ goal }: { goal: Goal }) {
  const theme = useAppTheme();
  const due = formatDayMonth(goal.due_date, today());
  return (
    <Pressable
      onPress={() => router.push("/goal")}
      android_ripple={{ color: theme.colors.surfaceVariant }}
      accessibilityRole="button"
      accessibilityLabel={`Goal, due ${due}. ${goal.title}`}
      style={[styles.card, { borderColor: theme.colors.outlineVariant }]}
    >
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {`Goal, due ${due}`}
      </Text>
      <Text variant="bodyLarge">{goal.title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 2 },
});
