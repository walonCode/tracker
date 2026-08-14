import { StyleSheet, Text, View } from "react-native";

/**
 * Add entry — formSheet modal route (see `_layout.tsx`), opened from the
 * tab bar's floating "+". Stub content for Phase 2 (navigation shell); the
 * real add-entry form lands in a later phase.
 */
export default function AddScreen() {
  return (
    <View style={styles.container}>
      <Text>Add (stub)</Text>
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
