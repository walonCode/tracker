import { router } from "expo-router";
import type { ReactNode } from "react";
import { Appbar } from "react-native-paper";

interface ScreenBarProps {
  title: string;
  /** Show the back arrow. Defaults to whether there is a screen to go back to. */
  back?: boolean;
  /** Right-side action slot, e.g. `<Appbar.Action … />`. */
  right?: ReactNode;
}

/** The top bar used by every screen. */
export function ScreenBar({ title, back = router.canGoBack(), right }: ScreenBarProps) {
  return (
    <Appbar.Header>
      {back ? <Appbar.BackAction onPress={() => router.back()} /> : null}
      <Appbar.Content title={title} />
      {right}
    </Appbar.Header>
  );
}
