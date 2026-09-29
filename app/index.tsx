import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { ScreenBar } from "@/components/ScreenBar";

// Placeholder for Today (plans 2 and 4).
export default function TodayScreen() {
  return (
    <View style={styles.root}>
      <ScreenBar title="Today" back={false} />
      <View style={styles.body}>
        <Text variant="bodyLarge">Nothing here yet.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
});
