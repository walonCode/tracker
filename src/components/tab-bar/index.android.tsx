import { Host } from "@expo/ui";
import {
  Column,
  FloatingActionButton,
  IconButton,
  NavigationBar,
  Row,
  Text,
} from "@expo/ui/jetpack-compose";
import { fillMaxSize } from "@expo/ui/jetpack-compose/modifiers";
import { router } from "expo-router";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { View } from "react-native";

import { useAppMaterialColors } from "@/theme/material-colors";

import { getTabItems, TAB_GLYPHS } from "./use-tab-items";

/**
 * Real Material 3 chrome for the bottom tab bar, built from
 * `@expo/ui/jetpack-compose`'s `Host` / `NavigationBar` / `Row` /
 * `IconButton` / `FloatingActionButton` (Android-only — see
 * `.claude/skills/expo-ui/references/jetpack-compose.md`). This is one of
 * two files in the app that import `@expo/ui/jetpack-compose` directly (the
 * other is `src/theme/material-colors.android.ts`, for `useMaterialColors()`);
 * both are correctly `.android`-platform-split and live outside `src/app/`
 * per that skill's file-placement rule. This one is picked automatically by
 * Metro's `.android.tsx` platform resolution — `(tabs)/_layout.tsx` just
 * imports `@/components/tab-bar` without knowing which platform file it got.
 *
 * Layout: a single `Row` (2 tab items, the "+" FAB, 1 tab item) inside one
 * `NavigationBar`, itself inside one `Host`. The "+" is a plain
 * `FloatingActionButton` with its own `onClick={() => router.push('/add')}`
 * — it is never one of the `state.routes` items, so it can never receive
 * `isFocused` styling or be "active" the way a real tab is.
 *
 * Tab icons are single-letter text glyphs (see `use-tab-items.ts`) rather
 * than vector-drawable XML assets: this is Phase 2 stub chrome (real screen
 * content lands later), and hand-authored vector-drawable XML can't be
 * verified without running the Android build, which is out of scope here.
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
      <Column horizontalAlignment="center" verticalArrangement={{ spacedBy: 2 }}>
        <IconButton onClick={item.onPress} colors={{ contentColor: tint }}>
          <Text style={{ fontWeight: item.isFocused ? "700" : "400" }}>
            {TAB_GLYPHS[item.routeName] ?? "•"}
          </Text>
        </IconButton>
        <Text style={{ typography: "labelSmall" }} color={tint}>
          {item.label}
        </Text>
      </Column>
    );
  };

  return (
    <View style={{ width: "100%", paddingBottom: insets.bottom }}>
      <Host matchContents={{ vertical: true }} style={{ width: "100%" }}>
        <NavigationBar containerColor={colors.surfaceContainer}>
          <Row
            horizontalArrangement="spaceEvenly"
            verticalAlignment="center"
            modifiers={[fillMaxSize()]}
          >
            {renderItem(today)}
            {renderItem(history)}
            <FloatingActionButton
              containerColor={colors.primaryContainer}
              onClick={() => router.push("/add")}
            >
              <FloatingActionButton.Icon>
                <Text
                  style={{ fontWeight: "700" }}
                  color={colors.onPrimaryContainer}
                >
                  +
                </Text>
              </FloatingActionButton.Icon>
            </FloatingActionButton>
            {renderItem(reports)}
          </Row>
        </NavigationBar>
      </Host>
    </View>
  );
}
