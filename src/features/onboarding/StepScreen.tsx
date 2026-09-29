import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

import { ScreenBar } from "@/components/ScreenBar";

interface StepScreenProps {
  title: string;
  back?: boolean;
  intro?: string;
  children?: ReactNode;
  actionLabel: string;
  onAction: () => void;
  busy?: boolean;
}

/** Shared frame for the first-run screens: bar, content, one filled action. */
export function StepScreen({ title, back = false, intro, children, actionLabel, onAction, busy }: StepScreenProps) {
  return (
    <View style={styles.root}>
      <ScreenBar title={title} back={back} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {intro ? <Text variant="bodyLarge">{intro}</Text> : null}
        {children}
      </ScrollView>
      <View style={styles.footer}>
        <Button mode="contained" onPress={onAction} loading={busy} disabled={busy}>
          {actionLabel}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 16 },
  footer: { padding: 16 },
});
