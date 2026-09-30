import * as allowedApps from "@/db/repos/allowedApps";
import * as planItems from "@/db/repos/planItems";
import * as sessions from "@/db/repos/sessions";
import type { Db, EndReason, Session } from "@/db/types";
import { nowSeconds } from "@/domain/clock";
import { overlapMs, remaining } from "@/domain/sessionMath";
import * as focus from "@/features/focus/focusMode";
import { refreshOutputs } from "@/features/refresh";

// The session engine: the sessions repo plus focus mode. Screens start,
// stop, and reconcile sessions only through here, so Do Not Disturb and
// blocking always follow the session.

/** Phone-call time inside the session's current running stretch. */
export function pausedMsFor(session: Session, now: number): number {
  if (session.state !== "running" || session.resumed_at === null) return 0;
  const fromMs = session.resumed_at * 1000;
  return overlapMs(focus.getCallIntervals(fromMs), fromMs, now * 1000);
}

async function beginFocus(db: Db, session: Session): Promise<void> {
  if (!focus.focusAvailable) return;
  const item = await planItems.get(db, session.plan_item_id);
  if (!item) return;
  const now = nowSeconds();
  const left = remaining(item, session, now, pausedMsFor(session, now));
  const allowed = await allowedApps.list(db);
  focus.startFocus({
    title: item.label_snapshot,
    endsAtMs: (now + left) * 1000,
    allowedPackages: allowed.map((app) => app.package_name),
  });
}

export async function startSession(db: Db, planItemId: number): Promise<Session> {
  // Ask before the session opens: the permission dialogs background the app,
  // and the foreground return must not find a session to recover yet.
  await focus.requestSessionPermissions().catch(() => {});
  const session = await sessions.start(db, planItemId);
  await beginFocus(db, session);
  return session;
}

export async function stopSession(db: Db, sessionId: number, reason: EndReason): Promise<void> {
  const session = await sessions.get(db, sessionId);
  const now = nowSeconds();
  if (session?.is_open === 1) {
    await sessions.stop(db, sessionId, reason, { at: now, pausedMs: pausedMsFor(session, now) });
  }
  focus.stopFocus();
  refreshOutputs(db);
}

/**
 * App start and foreground return: reconcile the open session with call
 * time subtracted, keep focus in step with it, and restore Do Not Disturb
 * left behind by a crash or a reboot.
 */
export async function reconcileSessions(db: Db): Promise<sessions.Recovery> {
  const recovery = await sessions.reconcileOpenSession(db, {
    pausedMsFor: (session) => pausedMsFor(session, nowSeconds()),
  });
  if (recovery.kind === "session") {
    const session = await sessions.get(db, recovery.sessionId);
    // A session that outlived its service (killed by the system) gets focus back.
    if (session?.state === "running" && !focus.serviceAlive(Date.now())) {
      focus.reconcileFocus();
      await beginFocus(db, session);
    }
  } else {
    focus.stopFocus();
    focus.reconcileFocus();
  }
  return recovery;
}
