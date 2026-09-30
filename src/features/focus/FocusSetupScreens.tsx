import { router } from "expo-router";
import { useState } from "react";

import { Screen } from "@/components/Screen";
import { ScreenBar } from "@/components/ScreenBar";
import { Row } from "@/components/ui";
import { useDb } from "@/db/DatabaseProvider";
import { StepScreen } from "@/features/onboarding/StepScreen";
import { setStep, stepRoute, type OnboardingStep } from "@/features/onboarding/steps";

import { AllowedAppsList } from "./AllowedAppsList";
import { PermissionsList } from "./PermissionsList";

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
    <StepScreen
      title="Protect your sessions"
      subtitle="Set once, change any time"
      actionLabel="Continue"
      onAction={advance}
      busy={busy}
    >
      <PermissionsList />
    </StepScreen>
  );
}

/** Screen 3 in first run. */
export function OnboardingAppsScreen() {
  const { busy, advance } = useAdvance("done");
  return (
    <StepScreen
      title="Allowed in sessions"
      subtitle="Everything else is blocked"
      actionLabel="Save"
      onAction={advance}
      busy={busy}
    >
      <AllowedAppsList />
    </StepScreen>
  );
}

/** Session settings, from the Today overflow menu and the Session screen's "Blocking is off" line. */
export function SessionSettingsScreen() {
  return (
    <Screen bar={<ScreenBar title="Session settings" />}>
      <Row
        title="Permissions"
        description="Do Not Disturb, usage access, overlay, battery"
        onPress={() => router.push("/settings/permissions")}
      />
      <Row
        title="Allowed apps"
        description="Apps that stay open during a session"
        onPress={() => router.push("/settings/apps")}
      />
    </Screen>
  );
}

export function SettingsPermissionsScreen() {
  return (
    <Screen bar={<ScreenBar title="Protect your sessions" subtitle="Set once, change any time" />}>
      <PermissionsList />
    </Screen>
  );
}

export function SettingsAppsScreen() {
  return (
    <Screen bar={<ScreenBar title="Allowed in sessions" subtitle="Everything else is blocked" />}>
      <AllowedAppsList />
    </Screen>
  );
}
