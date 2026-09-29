import { StubStep } from "@/features/onboarding/StubStep";

export default function AllowedAppsScreen() {
  return (
    <StubStep
      title="Allowed apps"
      intro="Choose the apps that stay open during a session. Phone is always allowed."
      next="done"
    />
  );
}
