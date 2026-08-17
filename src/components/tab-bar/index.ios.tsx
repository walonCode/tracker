import { Host } from "@expo/ui";
import { Button, HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  buttonBorderShape,
  buttonStyle,
  controlSize,
  font,
  foregroundStyle,
  frame,
  padding,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { router } from "expo-router";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import type { SFSymbol } from "sf-symbols-typescript";
import { View } from "react-native";

import { useAppMaterialColors } from "@/theme/material-colors";

import { getTabItems, TAB_ICON_NAMES } from "./use-tab-items";

/** Route's shared Material-Symbol name (see `use-tab-items.ts`) -> the real SF Symbol shown on iOS. */
const TAB_SF_SYMBOLS: Record<string, SFSymbol> = {
  home: "house.fill",
  bar_chart: "chart.bar.fill",
};

/**
 * Real SwiftUI chrome for the bottom tab bar (see
 * `.claude/skills/expo-ui/references/swift-ui.md`), the iOS counterpart of
 * `index.android.tsx`'s `@expo/ui/jetpack-compose` version. Picked
 * automatically by Metro's `.ios.tsx` platform resolution — `(tabs)/_layout.tsx`
 * just imports `@/components/tab-bar` without knowing which platform file it got.
 *
 * Deliberately hand-rolled from `HStack`/`Button`/`Image`/`Text` rather than
 * `@expo/ui/swift-ui`'s `TabView`: `TabView` is a *page switcher* — every
 * child must be a `<TabView.Tab>` that owns a full page of content, selected
 * via `selection`/`onSelectionChange`. There is no supported way to inject a
 * middle item that performs a one-off action (`router.push('/add')`) instead
 * of switching pages, which is exactly the same shape of problem noted in
 * `(tabs)/_layout.tsx`'s comment about `NativeTabs` failing to support a
 * non-route FAB — the reason this custom tab bar exists at all. So this file
 * mirrors the Android version's approach instead: one row, three items, the
 * center one a plain button that never becomes "selected" navigation state.
 *
 * Layout: an `HStack` with `Spacer`s between each item (a standard SwiftUI
 * idiom for even distribution in a custom bar — each `Spacer` expands
 * equally to fill the remaining space), inside one `Host`, inside a plain RN
 * `View` that owns the bar's background color and bottom safe-area padding
 * (`insets.bottom`) — the same structural split `index.android.tsx` uses
 * for the same reason (Android version's comment: `@expo/ui`'s `style.width`
 * can't parse a `"100%"` string; keeping full-bleed sizing and background on
 * the RN wrapper sidesteps that on both platforms and keeps the two files
 * structurally parallel).
 *
 * Icons are real SF Symbols (`chart.bar.fill` / `house.fill` / `plus`) via
 * `@expo/ui/swift-ui`'s `Image` component (`systemName`), not the universal
 * `Icon` — `Image` here also needs `VStack`-based custom layout (icon over
 * label, like a native tab item) which the universal `Icon` alone can't
 * compose the same way inside a `Button`'s custom `children`.
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
    const tintColor = item.isFocused ? colors.primary : colors.onSurfaceVariant;
    const symbol = TAB_SF_SYMBOLS[TAB_ICON_NAMES[item.routeName] ?? ""];
    return (
      <Button
        key={item.key}
        onPress={item.onPress}
        modifiers={[buttonStyle("plain")]}
      >
        <VStack alignment="center" spacing={2}>
          {symbol ? <Image systemName={symbol} size={22} color={tintColor} /> : null}
          <Text
            modifiers={[
              font({ size: 10, weight: item.isFocused ? "semibold" : "regular" }),
              foregroundStyle(tintColor),
            ]}
          >
            {item.label}
          </Text>
        </VStack>
      </Button>
    );
  };

  return (
    <View
      style={{
        width: "100%",
        paddingBottom: insets.bottom,
        paddingTop: 8,
        backgroundColor: colors.surfaceContainer,
      }}
    >
      <Host matchContents={{ vertical: true }}>
        <HStack alignment="center">
          <Spacer />
          {renderItem(today)}
          <Spacer />
          <Button
            onPress={() => router.push("/add")}
            modifiers={[
              buttonStyle("borderedProminent"),
              buttonBorderShape("circle"),
              controlSize("large"),
              tint(colors.primaryContainer),
              frame({ width: 56, height: 56 }),
              padding({ all: 0 }),
            ]}
          >
            <Image systemName="plus" size={22} color={colors.onPrimaryContainer} />
          </Button>
          <Spacer />
          {renderItem(insights)}
          <Spacer />
        </HStack>
      </Host>
    </View>
  );
}
