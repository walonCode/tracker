import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { IconButton, Menu, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/theme";

export interface OverflowItem {
  title: string;
  onPress: () => void;
}

interface ScreenBarProps {
  title: string;
  /** Second line under the title, e.g. the date or "One goal at a time". */
  subtitle?: string;
  /** Show the back arrow. Defaults to whether there is a screen to go back to. */
  back?: boolean;
  /** Show a close (✕) button on the right instead of a back arrow, for forms. */
  onClose?: () => void;
  /** Right-side action slot. */
  right?: ReactNode;
  /** Overflow (three dots) menu. Hidden while the list is empty. */
  menu?: readonly OverflowItem[];
}

/** The top bar used by every screen: a large title with an optional subtitle. */
export function ScreenBar({ title, subtitle, back, onClose, right, menu = [] }: ScreenBarProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const showBack = (back ?? router.canGoBack()) && !onClose;

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
      {showBack ? (
        <IconButton icon="arrow-left" accessibilityLabel="Back" onPress={() => router.back()} style={styles.back} />
      ) : null}
      <View style={[styles.titles, !showBack && styles.titlesNoBack]}>
        <Text variant="headlineSmall" accessibilityRole="header" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {onClose ? <IconButton icon="close" accessibilityLabel="Close" onPress={onClose} /> : null}
      {menu.length > 0 ? (
        <Menu
          visible={menuOpen}
          onDismiss={() => setMenuOpen(false)}
          anchor={
            <IconButton icon="dots-vertical" accessibilityLabel="More options" onPress={() => setMenuOpen(true)} />
          }
        >
          {menu.map((item) => (
            <Menu.Item
              key={item.title}
              title={item.title}
              onPress={() => {
                setMenuOpen(false);
                item.onPress();
              }}
            />
          ))}
        </Menu>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", minHeight: 64, paddingRight: 4, paddingBottom: 8 },
  back: { marginLeft: 4 },
  titles: { flex: 1, justifyContent: "center", paddingVertical: 4 },
  titlesNoBack: { paddingLeft: 20 },
});
