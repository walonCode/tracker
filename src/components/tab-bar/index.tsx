import { router } from "expo-router";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppMaterialColors } from "@/theme/material-colors";

import { getTabItems, TAB_ICON_NAMES } from "./use-tab-items";

/** Crude glyph fallback keyed by the same Material Symbol name used on Android. */
const FALLBACK_GLYPHS: Record<string, string> = {
  home: "⌂",
  bar_chart: "▤",
};

/**
 * Plain React Native fallback for the tab bar, used on every platform except
 * Android (`index.android.tsx` renders the real `@expo/ui/jetpack-compose`
 * Material 3 chrome, with real Material Symbols icons). iOS gets a native
 * tab bar treatment in a deferred follow-up phase — this keeps things
 * visually equivalent (Today + Insights + a center "Create" FAB that pushes
 * `/add`) and non-crashing in the meantime, with plain Unicode glyphs
 * standing in for real icons until then.
 */
export default function TabBar({
  state,
  descriptors,
  navigation,
  insets,
}: BottomTabBarProps) {
  const colors = useAppMaterialColors();
  const items = getTabItems({ state, descriptors, navigation });
  const [today, insights] = items;

  const renderItem = (item: (typeof items)[number] | undefined) => {
    if (!item) {
      return null;
    }
    const tint = item.isFocused ? colors.primary : colors.onSurfaceVariant;
    return (
      <Pressable
        key={item.key}
        onPress={item.onPress}
        style={({ pressed }) => [styles.item, pressed ? { opacity: 0.6 } : null]}
        accessibilityRole="tab"
        accessibilityState={{ selected: item.isFocused }}
      >
        <Text style={[styles.icon, { color: tint }]}>
          {FALLBACK_GLYPHS[TAB_ICON_NAMES[item.routeName] ?? ""] ?? "•"}
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
      <Pressable
        onPress={() => router.push("/add")}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.primaryContainer },
          pressed ? { transform: [{ scale: 0.92 }] } : null,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Create"
      >
        <Text style={[styles.fabIcon, { color: colors.onPrimaryContainer }]}>
          +
        </Text>
      </Pressable>
      {renderItem(insights)}
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
