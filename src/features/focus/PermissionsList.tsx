import { useEffect, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";
import { Button, Icon, Text } from "react-native-paper";

import { Hint, Row } from "@/components/ui";
import { useAppTheme } from "@/theme";

import * as focus from "./focusMode";

interface Permission {
  title: string;
  description: string;
  granted: () => boolean;
  open: () => void;
}

const PERMISSIONS: Permission[] = [
  {
    title: "Do Not Disturb access",
    description: "Silences notifications. Calls still ring.",
    granted: focus.hasDndAccess,
    open: focus.openDndSettings,
  },
  {
    title: "Usage access",
    description: "Sees which app is open during a session.",
    granted: focus.hasUsageAccess,
    open: focus.openUsageSettings,
  },
  {
    title: "Display over other apps",
    description: "Puts the session screen on top of blocked apps.",
    granted: focus.hasOverlayPermission,
    open: focus.openOverlaySettings,
  },
  {
    title: "Keep running during sessions",
    description: "Stops battery saving from ending a session early.",
    granted: focus.isIgnoringBatteryOptimizations,
    open: focus.requestIgnoreBatteryOptimizations,
  },
];

function readStatuses(): boolean[] {
  return PERMISSIONS.map((p) => p.granted());
}

/** Screen 2's rows: each opens its system settings screen; statuses refresh on return. */
export function PermissionsList() {
  const theme = useAppTheme();
  const [statuses, setStatuses] = useState(readStatuses);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setStatuses(readStatuses());
    });
    return () => subscription.remove();
  }, []);

  if (!focus.focusAvailable) {
    return <Hint>Focus mode is not available in this build. Sessions run as a timer.</Hint>;
  }

  return (
    <View>
      {PERMISSIONS.map((permission, i) => (
        <Row
          key={permission.title}
          title={permission.title}
          description={permission.description}
          onPress={permission.open}
          accessibilityLabel={`${permission.title}, ${statuses[i] ? "allowed" : "not allowed"}`}
          right={
            statuses[i] ? (
              <View style={styles.allowed}>
                <Icon source="check" size={16} color={theme.colors.primary} />
                <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
                  Allowed
                </Text>
              </View>
            ) : (
              <Button mode="contained-tonal" compact onPress={permission.open} style={styles.allow}>
                Allow
              </Button>
            )
          }
        />
      ))}
      <Hint style={styles.hint}>Everything stays on your phone.</Hint>
    </View>
  );
}

const styles = StyleSheet.create({
  allowed: { flexDirection: "row", alignItems: "center", gap: 4 },
  allow: { borderRadius: 16 },
  hint: { marginTop: 16 },
});
