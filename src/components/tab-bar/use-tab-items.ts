import type { BottomTabBarProps } from "expo-router/js-tabs";

/**
 * Route-name -> Material Symbol name for each tab's icon. Both platform
 * tab-bar variants (`index.android.tsx`'s `@expo/ui/jetpack-compose` Icon
 * and `index.tsx`'s plain-RN fallback) import their own icon assets keyed
 * off these names, so this map is just the shared source of truth for
 * *which* icon each route gets.
 */
export const TAB_ICON_NAMES: Record<string, string> = {
  index: "home",
  insights: "bar_chart",
};

export interface TabItem {
  key: string;
  routeName: string;
  label: string;
  isFocused: boolean;
  onPress: () => void;
}

/**
 * Derives the renderable tab items (label, focus state, press handler) from
 * the props React Navigation's bottom-tabs passes to a custom `tabBar`.
 * Shared by both platform variants of the tab bar component so the
 * focus/navigate logic (the standard React Navigation custom-tab-bar
 * pattern: emit `tabPress`, then `navigate` unless prevented) lives in one
 * place.
 */
export function getTabItems({
  state,
  descriptors,
  navigation,
}: Pick<
  BottomTabBarProps,
  "state" | "descriptors" | "navigation"
>): TabItem[] {
  return state.routes.map((route, index) => {
    const { options } = descriptors[route.key];
    const isFocused = state.index === index;

    return {
      key: route.key,
      routeName: route.name,
      label: typeof options.title === "string" ? options.title : route.name,
      isFocused,
      onPress: () => {
        const event = navigation.emit({
          type: "tabPress",
          target: route.key,
          canPreventDefault: true,
        });
        if (!isFocused && !event.defaultPrevented) {
          navigation.navigate(route.name);
        }
      },
    };
  });
}
