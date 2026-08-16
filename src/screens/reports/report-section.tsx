import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAppMaterialColors } from "@/theme/material-colors";

/**
 * Shared section wrapper (uppercase label + content) reused by every Reports
 * section — mirrors the inline "sectionTitle" pattern in
 * `src/screens/today/index.tsx`, pulled into one place here since the
 * Reports screen has several more sections than Today does.
 */
export function ReportSection({ title, children }: { title: string; children: ReactNode }) {
  const colors = useAppMaterialColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: colors.onSurfaceVariant }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
