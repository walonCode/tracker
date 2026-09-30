import { useState, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView, useKeyboardState } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/theme";

interface ScreenProps {
  /** Usually a `ScreenBar`. */
  bar: ReactNode;
  children?: ReactNode;
  /** Actions pinned to the bottom; they ride above the keyboard while it is open. */
  footer?: ReactNode;
  /** False when the children bring their own list (FlatList and friends). */
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

const FOOTER_GAP = 16;

/**
 * Screen frame: bar, content, and an optional footer. Scrolling content
 * keeps the focused field above the keyboard (and above the footer).
 */
export function Screen({ bar, children, footer, scroll = true, contentStyle }: ScreenProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [footerHeight, setFooterHeight] = useState(0);
  const keyboardHeight = useKeyboardState((state) => (state.isVisible ? state.height : 0));

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {bar}
      {scroll ? (
        <KeyboardAwareScrollView
          style={styles.grow}
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          bottomOffset={footerHeight + FOOTER_GAP}
        >
          {children}
        </KeyboardAwareScrollView>
      ) : (
        <View style={[styles.grow, contentStyle]}>{children}</View>
      )}
      {/* While a docked keyboard is up, drop the gesture-bar padding it now covers;
          a floating keyboard reports no height and must not move the footer. */}
      {footer ? (
        <KeyboardStickyView offset={{ opened: keyboardHeight > insets.bottom ? insets.bottom : 0 }}>
          <View
            onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
            style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: theme.colors.background }]}
          >
            {footer}
          </View>
        </KeyboardStickyView>
      ) : (
        <View style={{ height: insets.bottom }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  grow: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 24, gap: 16 },
  footer: { paddingHorizontal: 20, paddingTop: 12, gap: 10 },
});
