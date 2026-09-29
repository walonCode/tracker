import { router, SplashScreen, useRootNavigationState } from "expo-router";
import { useEffect, useRef } from "react";

import { useDb } from "@/db/DatabaseProvider";

import { getStep, stepRoute } from "./steps";

SplashScreen.preventAutoHideAsync();

/**
 * On launch, sends an unfinished first run back to its saved step. The
 * splash screen stays up until the check resolves so Today never flashes.
 */
export function useOnboardingRedirect(): void {
  const db = useDb();
  const navigationReady = Boolean(useRootNavigationState()?.key);
  const checked = useRef(false);

  useEffect(() => {
    if (!navigationReady || checked.current) return;
    checked.current = true;
    getStep(db)
      .then((step) => {
        if (step !== "done") router.replace(stepRoute(step));
      })
      .finally(() => SplashScreen.hideAsync());
  }, [db, navigationReady]);
}
