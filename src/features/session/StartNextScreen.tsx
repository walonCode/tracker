import { router } from "expo-router";
import { useEffect } from "react";

import { useDb } from "@/db/DatabaseProvider";
import * as planItems from "@/db/repos/planItems";
import * as sessions from "@/db/repos/sessions";
import { today } from "@/domain/dates";
import { nextItem } from "@/domain/session";

import { startSession } from "./engine";

/**
 * `focusapp://start-next`, from the home-screen widget: starts today's Next
 * item and lands on the Session screen. An open session is resumed instead;
 * with nothing planned, it goes to Today.
 */
export function StartNextScreen() {
  const db = useDb();

  useEffect(() => {
    (async () => {
      if (await sessions.getOpen(db)) return true;
      const next = nextItem(await planItems.listDayWithTasks(db, today()));
      if (!next) return false;
      await startSession(db, next.id);
      return true;
    })()
      .catch(() => false)
      .then((started) => router.replace(started ? "/session" : "/"));
  }, [db]);

  return null;
}
