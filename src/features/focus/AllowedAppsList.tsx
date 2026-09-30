import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Switch, Text } from "react-native-paper";

import { Hint, Row } from "@/components/ui";
import { useDb } from "@/db/DatabaseProvider";
import * as allowedApps from "@/db/repos/allowedApps";
import { useAppTheme } from "@/theme";

import * as focus from "./focusMode";

interface AppRow {
  packageName: string;
  label: string;
}

/** The tonal letter square in front of each app. */
function AppInitial({ label }: { label: string }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.initial, { backgroundColor: theme.colors.primaryContainer }]}>
      <Text variant="titleSmall" style={{ color: theme.colors.onPrimaryContainer }}>
        {label.trim().charAt(0).toUpperCase() || "?"}
      </Text>
    </View>
  );
}

/**
 * Screen 3's list: Phone is fixed on; every launchable app has a switch.
 * Enabled apps sort first when the list loads (not on every toggle, so rows
 * do not jump under the finger).
 */
export function AllowedAppsList() {
  const db = useDb();
  const theme = useAppTheme();
  const [apps, setApps] = useState<AppRow[] | null>(null);
  const [allowed, setAllowed] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([focus.listLaunchableApps(), allowedApps.list(db)]).then(([installed, saved]) => {
      const on = new Set(saved.map((a) => a.package_name));
      setAllowed(on);
      setApps([...installed].sort((a, b) => Number(on.has(b.packageName)) - Number(on.has(a.packageName))));
    });
  }, [db]);

  async function toggle(app: AppRow, value: boolean) {
    setAllowed((current) => {
      const next = new Set(current);
      if (value) next.add(app.packageName);
      else next.delete(app.packageName);
      return next;
    });
    await allowedApps.setAllowed(db, { package_name: app.packageName, label: app.label }, value);
  }

  if (!focus.focusAvailable) {
    return <Hint>Focus mode is not available in this build. No apps are blocked.</Hint>;
  }

  return (
    <View>
      <Row
        title="Phone"
        description="Always allowed. Calls come through."
        left={<AppInitial label="Phone" />}
        right={
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Always
          </Text>
        }
      />
      {apps === null ? <ActivityIndicator style={styles.loading} /> : null}
      {apps?.map((app) => (
        <Row
          key={app.packageName}
          title={app.label}
          left={<AppInitial label={app.label} />}
          onPress={() => toggle(app, !allowed.has(app.packageName))}
          accessibilityLabel={`${app.label}, ${allowed.has(app.packageName) ? "allowed" : "blocked"}`}
          right={
            <Switch
              value={allowed.has(app.packageName)}
              onValueChange={(value) => toggle(app, value)}
              accessibilityLabel={`Allow ${app.label}`}
            />
          }
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  initial: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  loading: { marginTop: 16 },
});
