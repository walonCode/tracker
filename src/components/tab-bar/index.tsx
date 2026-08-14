import { router } from "expo-router";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppMaterialColors } from "@/theme/material-colors";

import { getTabItems, TAB_GLYPHS } from "./use-tab-items";

/**
 * Plain React Native fallback for the tab bar, used on every platform except
 * Android (`index.android.tsx` renders the real `@expo/ui/jetpack-compose`
 * Material 3 chrome). iOS gets a native tab bar treatment in a deferred
 * follow-up phase — this keeps things visually equivalent (same 3 tabs +
 * center "+" that pushes `/add`) and non-crashing in the meantime.
 */
export default function TabBar({
  state,
  descriptors,
  navigation,
  insets,
}: BottomTabBarProps) {
  const colors = useAppMaterialColors();
  const items = getTabItems({ state, descriptors, navigation });
  const [today, history, reports] = items;

  const renderItem = (item: (typeof items)[number] | undefined) => {
    if (!item) {
      return null;
    }
    const tint = item.isFocused ? colors.primary : colors.onSurfaceVariant;
    return (
      <Pressable
        key={item.key}
        onPress={item.onPress}
        style={styles.item}
        accessibilityRole="tab"
        accessibilityState={{ selected: item.isFocused }}
      >
        <Text style={[styles.icon, { color: tint }]}>
          {TAB_GLYPHS[item.routeName] ?? "•"}
        </Text>
        <Text style={[styles.label, { color: tint }]}>{item.label}</Text>
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingBottom: insets.bottom,
          backgroundColor: colors.surfaceContainer,
        },
      ]}
    >
      {renderItem(today)}
      {renderItem(history)}
      <Pressable
        onPress={() => router.push("/add")}
        style={[styles.fab, { backgroundColor: colors.primaryContainer }]}
        accessibilityRole="button"
        accessibilityLabel="Add"
      >
        <Text style={[styles.fabIcon, { color: colors.onPrimaryContainer }]}>
          +
        </Text>
      </Pressable>
      {renderItem(reports)}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingTop: 8,
    width: "100%",
  },
  item: {
    alignItems: "center",
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  icon: {
    fontSize: 18,
    fontWeight: "600",
  },
  label: {
    fontSize: 12,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  fabIcon: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 24,
  },
});
