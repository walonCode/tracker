import { StubStep } from "@/features/onboarding/StubStep";

export default function PermissionsScreen() {
  return (
    <StubStep
      title="Permissions"
      intro="Blocking needs a few system permissions. You can skip them; sessions then run as a timer only."
      next="apps"
    />
  );
}
