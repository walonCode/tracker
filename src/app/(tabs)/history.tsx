import { StyleSheet, Text, View } from "react-native";

/**
 * History tab — stub content for Phase 2 (navigation shell). Real content
 * lands in a later phase.
 */
export default function HistoryScreen() {
  return (
    <View style={styles.container}>
      <Text>History (stub)</Text>
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
