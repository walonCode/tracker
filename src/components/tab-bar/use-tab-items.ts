import type { BottomTabBarProps } from "expo-router/js-tabs";

/**
 * Route-name -> single-character glyph used as a placeholder tab icon.
 * Phase 2 stub only — real icons come with the real screen content in a
 * later phase. Kept here (rather than as vector-drawable assets) so it can
 * be shared verbatim between the Compose (`index.android.tsx`) and
 * plain-RN (`index.tsx`) tab bar implementations.
 */
export const TAB_GLYPHS: Record<string, string> = {
  index: "T",
  history: "H",
  reports: "R",
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
