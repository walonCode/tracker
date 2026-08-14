import { StyleSheet, Text, View } from "react-native";

/**
 * Prayer log — formSheet modal route (see `_layout.tsx`). Stub content for
 * Phase 2 (navigation shell); the real prayer-log form lands in a later
 * phase.
 */
export default function PrayerLogScreen() {
  return (
    <View style={styles.container}>
      <Text>Prayer Log (stub)</Text>
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
