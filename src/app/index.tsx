import { Host, Text as UiText } from "@expo/ui";
import { Canvas, Circle } from "@shopify/react-native-skia";
import * as SQLite from "expo-sqlite";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

/**
 * Temporary Phase 0 smoke test: proves expo-sqlite, react-native-skia, and
 * @expo/ui (Jetpack Compose) all load and render before any feature code
 * depends on them. Replaced by the real Today screen in Phase 4.
 */
export default function Index() {
  const [pragmaValue] = useState<number | null>(() => {
    const db = SQLite.openDatabaseSync("smoke-test.db");
    const row = db.getFirstSync<{ user_version: number }>(
      "PRAGMA user_version"
    );
    return row?.user_version ?? null;
  });

  return (
    <View style={styles.container}>
      <Text style={styles.label}>SQLite PRAGMA user_version:</Text>
      <Text style={styles.value}>
        {pragmaValue === null ? "loading…" : pragmaValue}
      </Text>

      <Text style={styles.label}>Skia canvas:</Text>
      <Canvas style={styles.canvas}>
        <Circle cx={50} cy={50} r={40} color="#208AEF" />
      </Canvas>

      <Text style={styles.label}>@expo/ui (Jetpack Compose):</Text>
      <Host matchContents>
        <UiText>Compose is rendering</UiText>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  label: {
    fontWeight: "600",
    marginTop: 12,
  },
  value: {
    fontSize: 18,
  },
  canvas: {
    width: 100,
    height: 100,
  },
});
