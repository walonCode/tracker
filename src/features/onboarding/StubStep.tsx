import { router } from "expo-router";
import { useState } from "react";

import { useDb } from "@/db/DatabaseProvider";

import { StepScreen } from "./StepScreen";
import { setStep, stepRoute, type OnboardingStep } from "./steps";

interface StubStepProps {
  title: string;
  intro: string;
  next: OnboardingStep;
}

/** Placeholder for the permissions and allowed-apps steps until plan 5. */
export function StubStep({ title, intro, next }: StubStepProps) {
  const db = useDb();
  const [busy, setBusy] = useState(false);

  async function onContinue() {
    setBusy(true);
    await setStep(db, next);
    router.replace(stepRoute(next));
  }

  return (
    <StepScreen title={title} intro={intro} actionLabel="Continue" onAction={onContinue} busy={busy} />
  );
}
