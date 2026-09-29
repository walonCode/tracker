import type { AllowedApp, Db } from "../types";
import { notImplemented } from "./notImplemented";

// Implemented in plan 5.

export async function list(_db: Db): Promise<AllowedApp[]> {
  return notImplemented("allowedApps.list");
}

export async function setAllowed(_db: Db, _app: AllowedApp, _allowed: boolean): Promise<void> {
  return notImplemented("allowedApps.setAllowed");
}
