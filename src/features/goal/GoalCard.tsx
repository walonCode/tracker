import { router } from "expo-router";
import { StyleSheet } from "react-native";
import { Card, Text } from "react-native-paper";

import type { Goal } from "@/db/types";
import { formatDate, today } from "@/domain/dates";

export function GoalCard({ goal }: { goal: Goal }) {
  const due = formatDate(goal.due_date, today());
  return (
    <Card
      mode="outlined"
      onPress={() => router.push("/goal")}
      accessibilityLabel={`Goal, due ${due}. ${goal.title}`}
    >
      <Card.Content style={styles.content}>
        <Text variant="labelMedium">Goal, due {due}</Text>
        <Text variant="titleMedium">{goal.title}</Text>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { gap: 4 },
});
