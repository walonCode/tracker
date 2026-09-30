import { useEffect, useState } from "react";
import { View } from "react-native";
import { ActivityIndicator, List, Switch, Text } from "react-native-paper";

import { useDb } from "@/db/DatabaseProvider";
import * as allowedApps from "@/db/repos/allowedApps";

import * as focus from "./focusMode";

interface AppRow {
  packageName: string;
  label: string;
}

/**
 * Screen 3's list: Phone is fixed on; every launchable app has a switch.
 * Enabled apps sort first when the list loads (not on every toggle, so rows
 * do not jump under the finger).
 */
export function AllowedAppsList() {
  const db = useDb();
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
    return <Text variant="bodyLarge">Focus mode is not available in this build. No apps are blocked.</Text>;
  }

  return (
    <View>
      <List.Item
        title="Phone"
        description="Always allowed"
        left={(props) => <List.Icon {...props} icon="phone" />}
        right={() => <Switch value disabled accessibilityLabel="Phone, always allowed" />}
      />
      {apps === null ? <ActivityIndicator style={{ marginTop: 16 }} /> : null}
      {apps?.map((app) => (
        <List.Item
          key={app.packageName}
          title={app.label}
          right={() => (
            <Switch
              value={allowed.has(app.packageName)}
              onValueChange={(value) => toggle(app, value)}
              accessibilityLabel={`Allow ${app.label}`}
            />
          )}
        />
      ))}
    </View>
  );
}
