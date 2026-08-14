import { StyleSheet, Text, View } from "react-native";

/**
 * Today tab — stub content for Phase 2 (navigation shell). Real content
 * (today's trackers, contribution graph, etc.) lands in a later phase.
 */
export default function TodayScreen() {
  return (
    <View style={styles.container}>
      <Text>Today (stub)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
