import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { useDb } from "@/db/DatabaseProvider";
import * as goals from "@/db/repos/goals";
import type { Goal } from "@/db/types";

/**
 * The active goal, reloaded each time the screen gains focus.
 * `undefined` while loading, `null` when there is no active goal.
 */
export function useActiveGoal(): Goal | null | undefined {
  const db = useDb();
  const [goal, setGoal] = useState<Goal | null | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      goals.getActive(db).then((result) => {
        if (active) setGoal(result);
      });
      return () => {
        active = false;
      };
    }, [db]),
  );

  return goal;
}
