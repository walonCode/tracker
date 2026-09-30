import { useEffect, useState } from "react";
import { AppState, View } from "react-native";
import { List, Text } from "react-native-paper";

import { useAppTheme } from "@/theme";

import * as focus from "./focusMode";

interface Row {
  title: string;
  description: string;
  granted: () => boolean;
  open: () => void;
}

const ROWS: Row[] = [
  {
    title: "Do Not Disturb access",
    description: "Silence notifications during a session. Calls still ring.",
    granted: focus.hasDndAccess,
    open: focus.openDndSettings,
  },
  {
    title: "Usage access",
    description: "See which app is open, to block the ones not allowed.",
    granted: focus.hasUsageAccess,
    open: focus.openUsageSettings,
  },
  {
    title: "Display over other apps",
    description: "Bring up the block screen over a blocked app.",
    granted: focus.hasOverlayPermission,
    open: focus.openOverlaySettings,
  },
  {
    title: "Keep running during sessions",
    description: "Stop battery optimization from ending a session early.",
    granted: focus.isIgnoringBatteryOptimizations,
    open: focus.requestIgnoreBatteryOptimizations,
  },
];

function readStatuses(): boolean[] {
  return ROWS.map((row) => row.granted());
}

/** Screen 2's rows. Each opens its system settings screen; statuses refresh on return. */
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
    return <Text variant="bodyLarge">Focus mode is not available in this build. Sessions run as a timer.</Text>;
  }

  return (
    <View>
      {ROWS.map((row, i) => (
        <List.Item
          key={row.title}
          title={row.title}
          description={row.description}
          descriptionNumberOfLines={3}
          onPress={row.open}
          right={(props) => (
            <List.Icon
              {...props}
              icon={statuses[i] ? "check-circle" : "chevron-right"}
              color={statuses[i] ? theme.colors.primary : props.color}
            />
          )}
          accessibilityLabel={`${row.title}, ${statuses[i] ? "allowed" : "not allowed"}`}
        />
      ))}
    </View>
  );
}
