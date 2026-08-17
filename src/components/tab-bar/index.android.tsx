import { Host } from "@expo/ui";
import {
  Column,
  FloatingActionButton,
  Icon,
  IconButton,
  NavigationBar,
  Row,
  Text,
} from "@expo/ui/jetpack-compose";
import { fillMaxSize } from "@expo/ui/jetpack-compose/modifiers";
import AddIcon from "@expo/material-symbols/add.xml";
import BarChartIcon from "@expo/material-symbols/bar_chart.xml";
import HomeIcon from "@expo/material-symbols/home.xml";
import { router } from "expo-router";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import type { ImageSourcePropType } from "react-native";
import { View } from "react-native";

import { useAppMaterialColors } from "@/theme/material-colors";

import { getTabItems, TAB_ICON_NAMES } from "./use-tab-items";

const TAB_ICON_SOURCES: Record<string, ImageSourcePropType> = {
  home: HomeIcon,
  bar_chart: BarChartIcon,
};

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
 * Layout: a single `Row` (Today, the "Create" FAB, Insights) inside one
 * `NavigationBar`, itself inside one `Host`. The FAB is a plain
 * `FloatingActionButton` with its own `onClick={() => router.push('/add')}`
 * — it is never one of the `state.routes` items, so it can never receive
 * `isFocused` styling or be "active" the way a real tab is.
 *
 * Icons are real Material Symbols XML vector drawables (`@expo/material-symbols`,
 * `require()`'d per-icon so Metro only bundles the ones actually used),
 * rendered via `@expo/ui/jetpack-compose`'s `Icon`. No `tint` is passed
 * explicitly — it inherits the surrounding `IconButton`'s `contentColor`, so
 * the existing focused/unfocused tint logic below still drives icon color.
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
    const iconSource = TAB_ICON_SOURCES[TAB_ICON_NAMES[item.routeName] ?? ""];
    return (
      <Column horizontalAlignment="center" verticalArrangement={{ spacedBy: 2 }}>
        <IconButton onClick={item.onPress} colors={{ contentColor: tint }}>
          {iconSource ? (
            <Icon source={iconSource} size={24} contentDescription={item.label} />
          ) : null}
        </IconButton>
        <Text style={{ typography: "labelSmall", fontWeight: item.isFocused ? "700" : "400" }} color={tint}>
          {item.label}
        </Text>
      </Column>
    );
  };

  return (
    <View style={{ width: "100%", paddingBottom: insets.bottom }}>
      {/*
        No explicit width here: @expo/ui's universal `style.width` bridges to
        a native Int on Android and can't parse a percentage string like
        "100%" (crashes with a FieldCastException). The wrapping RN `View`
        above is already full-width, and Host stretches to fill it under
        RN's default `alignItems: "stretch"`.
      */}
      <Host matchContents={{ vertical: true }}>
        <NavigationBar containerColor={colors.surfaceContainer}>
          <Row
            horizontalArrangement="spaceEvenly"
            verticalAlignment="center"
            modifiers={[fillMaxSize()]}
          >
            {renderItem(today)}
            <FloatingActionButton
              containerColor={colors.primaryContainer}
              onClick={() => router.push("/add")}
            >
              <FloatingActionButton.Icon>
                <Icon source={AddIcon} size={24} tint={colors.onPrimaryContainer} />
              </FloatingActionButton.Icon>
            </FloatingActionButton>
            {renderItem(insights)}
          </Row>
        </NavigationBar>
      </Host>
    </View>
  );
}
