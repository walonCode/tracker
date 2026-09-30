import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Button } from "react-native-paper";

import { ScreenBar, type OverflowItem } from "@/components/ScreenBar";
import { GoalCard } from "@/features/goal/GoalCard";
import { useActiveGoal } from "@/features/goal/useActiveGoal";

// Plan 5 adds Session settings and plan 7 adds Export data.
const OVERFLOW_ITEMS: OverflowItem[] = [{ title: "Saved tasks", onPress: () => router.push("/tasks") }];

export function TodayScreen() {
  const goal = useActiveGoal();

  return (
    <View style={styles.root}>
      <ScreenBar title="Today" back={false} menu={OVERFLOW_ITEMS} />
      {goal === null ? (
        <View style={styles.empty}>
          <Button
            mode="contained"
            onPress={() => router.push({ pathname: "/onboarding/goal", params: { mode: "next" } })}
          >
            Set your next goal
          </Button>
        </View>
      ) : (
        <View style={styles.body}>
          {goal ? <GoalCard goal={goal} /> : null}
          {/* Task list: plan 4. */}
          <Button mode="text" onPress={() => router.push("/plan")}>
            Plan tomorrow
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { padding: 16, gap: 16 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
});
