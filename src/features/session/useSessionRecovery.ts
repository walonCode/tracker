import { router, usePathname, useRootNavigationState } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { useDb } from "@/db/DatabaseProvider";
import * as sessions from "@/db/repos/sessions";

const SESSION_ROUTES = ["/session", "/done"];

/**
 * Runs `reconcileOpenSession` at app start and on every foreground return:
 * an open session goes back to the Session screen, one whose limit passed
 * goes to the finish check. The Session screen reconciles itself.
 */
export function useSessionRecovery(): void {
  const db = useDb();
  const navigationReady = Boolean(useRootNavigationState()?.key);
  const pathname = usePathname();
  const pathRef = useRef(pathname);

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!navigationReady) return;

    async function reconcile() {
      // These screens handle the open session themselves.
      if (SESSION_ROUTES.includes(pathRef.current)) return;
      const recovery = await sessions.reconcileOpenSession(db);
      if (recovery.kind === "session") router.push("/session");
      else if (recovery.kind === "finish") {
        router.push({ pathname: "/done", params: { session: String(recovery.sessionId) } });
      }
    }

    reconcile();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") reconcile();
    });
    return () => subscription.remove();
  }, [db, navigationReady]);
}
