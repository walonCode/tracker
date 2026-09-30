import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { List } from "react-native-paper";

import { ScreenBar } from "@/components/ScreenBar";
import { useDb } from "@/db/DatabaseProvider";
import { StepScreen } from "@/features/onboarding/StepScreen";
import { setStep, stepRoute, type OnboardingStep } from "@/features/onboarding/steps";

import { AllowedAppsList } from "./AllowedAppsList";
import { PermissionsList } from "./PermissionsList";

const PERMISSIONS_INTRO =
  "Blocking needs a few system permissions. You can skip them; sessions then run as a timer only.";
const APPS_INTRO = "Choose the apps that stay open during a session. Phone is always allowed.";

function useAdvance(next: OnboardingStep) {
  const db = useDb();
  const [busy, setBusy] = useState(false);
  async function advance() {
    setBusy(true);
    await setStep(db, next);
    router.replace(stepRoute(next));
  }
  return { busy, advance };
}

/** Screen 2 in first run. Continue is always enabled: permissions are optional. */
export function OnboardingPermissionsScreen() {
  const { busy, advance } = useAdvance("apps");
  return (
    <StepScreen title="Permissions" intro={PERMISSIONS_INTRO} actionLabel="Continue" onAction={advance} busy={busy}>
      <PermissionsList />
    </StepScreen>
  );
}

/** Screen 3 in first run. */
export function OnboardingAppsScreen() {
  const { busy, advance } = useAdvance("done");
  return (
    <StepScreen title="Allowed apps" intro={APPS_INTRO} actionLabel="Continue" onAction={advance} busy={busy}>
      <AllowedAppsList />
    </StepScreen>
  );
}

/** Session settings, from the Today overflow menu and the Session screen's "Blocking is off" line. */
export function SessionSettingsScreen() {
  return (
    <View style={styles.root}>
      <ScreenBar title="Session settings" />
      <List.Item
        title="Permissions"
        description="Do Not Disturb, usage access, overlay, battery"
        left={(props) => <List.Icon {...props} icon="shield-check-outline" />}
        onPress={() => router.push("/settings/permissions")}
      />
      <List.Item
        title="Allowed apps"
        description="Apps that stay open during a session"
        left={(props) => <List.Icon {...props} icon="apps" />}
        onPress={() => router.push("/settings/apps")}
      />
    </View>
  );
}

export function SettingsPermissionsScreen() {
  return (
    <View style={styles.root}>
      <ScreenBar title="Permissions" />
      <ScrollView contentContainerStyle={styles.content}>
        <PermissionsList />
      </ScrollView>
    </View>
  );
}

export function SettingsAppsScreen() {
  return (
    <View style={styles.root}>
      <ScreenBar title="Allowed apps" />
      <ScrollView contentContainerStyle={styles.content}>
        <AllowedAppsList />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingVertical: 8 },
});
