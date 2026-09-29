import type { Db, EndReason, Session } from "../types";
import { notImplemented } from "./notImplemented";

// Implemented in plan 4.

export async function getOpen(_db: Db): Promise<Session | null> {
  return notImplemented("sessions.getOpen");
}

export async function start(_db: Db, _planItemId: number): Promise<Session> {
  return notImplemented("sessions.start");
}

export async function stop(_db: Db, _sessionId: number, _reason: EndReason): Promise<void> {
  return notImplemented("sessions.stop");
}
