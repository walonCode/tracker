import type { Href } from "expo-router";

import * as settings from "@/db/repos/settings";
import type { Db } from "@/db/types";

// First-run progress lives in settings so a killed app resumes on the same
// step. Each step advances only when its screen finishes.

export const ONBOARDING_STEP_KEY = "onboarding_step";

export const ONBOARDING_STEPS = ["goal", "permissions", "apps", "done"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export async function getStep(db: Db): Promise<OnboardingStep> {
  const value = await settings.get(db, ONBOARDING_STEP_KEY);
  return ONBOARDING_STEPS.find((step) => step === value) ?? "goal";
}

export async function setStep(db: Db, step: OnboardingStep): Promise<void> {
  await settings.set(db, ONBOARDING_STEP_KEY, step);
}

export function stepRoute(step: OnboardingStep): Href {
  switch (step) {
    case "goal":
      return "/onboarding/goal";
    case "permissions":
      return "/onboarding/permissions";
    case "apps":
      return "/onboarding/apps";
    case "done":
      return "/";
  }
}
