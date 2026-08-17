import { router } from "expo-router";

import OnboardingScreen from "@/screens/onboarding";

/**
 * Onboarding route. Only ever reachable as the Stack's initial screen on a
 * fresh install — see `src/app/_layout.tsx` for the conditional
 * `<Stack.Screen>` that includes/excludes this route based on the
 * `onboarding_completed` app_meta flag.
 */
export default function Onboarding() {
  return <OnboardingScreen onDone={() => router.replace("/(tabs)")} />;
}
