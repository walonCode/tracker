import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Appbar, Menu } from "react-native-paper";

export interface OverflowItem {
  title: string;
  onPress: () => void;
}

interface ScreenBarProps {
  title: string;
  /** Show the back arrow. Defaults to whether there is a screen to go back to. */
  back?: boolean;
  /** Right-side action slot, e.g. `<Appbar.Action … />`. */
  right?: ReactNode;
  /** Overflow (three dots) menu. Hidden while the list is empty. */
  menu?: readonly OverflowItem[];
}

/** The top bar used by every screen. */
export function ScreenBar({ title, back = router.canGoBack(), right, menu = [] }: ScreenBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Appbar.Header>
      {back ? <Appbar.BackAction onPress={() => router.back()} /> : null}
      <Appbar.Content title={title} />
      {right}
      {menu.length > 0 ? (
        <Menu
          visible={menuOpen}
          onDismiss={() => setMenuOpen(false)}
          anchor={
            <Appbar.Action
              icon="dots-vertical"
              accessibilityLabel="More options"
              onPress={() => setMenuOpen(true)}
            />
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
    </Appbar.Header>
  );
}
