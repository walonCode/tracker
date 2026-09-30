import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Button, Chip, Text } from "react-native-paper";

import { useAppTheme } from "@/theme";

// Small building blocks that match docs/focus-app-full-flow.html.

type ActionKind = "filled" | "tonal" | "outlined" | "text";

const MODE = { filled: "contained", tonal: "contained-tonal", outlined: "outlined", text: "text" } as const;

interface ActionProps {
  kind?: ActionKind;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: StyleProp<ViewStyle>;
  children: string;
}

/** A 48 dp pill button, full width unless styled otherwise. */
export function Action({ kind = "filled", onPress, loading, disabled, icon, style, children }: ActionProps) {
  return (
    <Button
      mode={MODE[kind]}
      onPress={onPress}
      loading={loading}
      disabled={disabled || loading}
      icon={icon}
      style={[kind !== "text" && styles.pill, style]}
      contentStyle={kind !== "text" ? styles.pillContent : undefined}
      labelStyle={styles.label}
    >
      {children}
    </Button>
  );
}

interface RowProps {
  title: string;
  description?: string | null;
  left?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  muted?: boolean;
  struck?: boolean;
  divider?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/** A list row: optional leading element, title and description, trailing element, hairline below. */
export function Row({
  title,
  description,
  left,
  right,
  onPress,
  onLongPress,
  muted,
  struck,
  divider = true,
  accessibilityLabel,
  accessibilityHint,
}: RowProps) {
  const theme = useAppTheme();
  const body = (
    <View
      style={[
        styles.row,
        divider && { borderBottomColor: theme.colors.outlineVariant, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      {left}
      <View style={styles.rowText}>
        <Text
          variant="bodyLarge"
          style={[
            (muted || struck) && { color: theme.colors.onSurfaceVariant },
            struck && styles.struck,
          ]}
        >
          {title}
        </Text>
        {description ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {description}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
  if (!onPress && !onLongPress) return body;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      android_ripple={{ color: theme.colors.surfaceVariant }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      {body}
    </Pressable>
  );
}

/** Secondary explanatory text. */
export function Hint({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useAppTheme();
  return (
    <View style={style}>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 20 }}>
        {children}
      </Text>
    </View>
  );
}

interface ChoiceChipProps {
  selected?: boolean;
  onPress?: () => void;
  icon?: string;
  children: string;
}

/** Outlined when off, tonal when on, as in the mockup; no check mark. */
export function ChoiceChip({ selected = false, onPress, icon, children }: ChoiceChipProps) {
  const theme = useAppTheme();
  return (
    <Chip
      mode="outlined"
      selected={selected}
      showSelectedCheck={false}
      icon={icon}
      onPress={onPress}
      accessibilityState={{ selected }}
      style={
        selected
          ? { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primaryContainer }
          : { backgroundColor: "transparent", borderColor: theme.colors.outlineVariant }
      }
      textStyle={{ color: selected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant }}
    >
      {children}
    </Chip>
  );
}

/** A small section label above chips or fields. */
export function Label({ children }: { children: string }) {
  const theme = useAppTheme();
  return (
    <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: 24 },
  pillContent: { height: 48 },
  label: { fontSize: 15 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, minHeight: 56 },
  rowText: { flex: 1, gap: 3 },
  struck: { textDecorationLine: "line-through" },
});
