import type { AllowedApp, Db } from "../types";

/** Apps the user allows during a session, beyond the always-allowed ones. */
export async function list(db: Db): Promise<AllowedApp[]> {
  return db.getAllAsync<AllowedApp>("SELECT * FROM allowed_apps ORDER BY label COLLATE NOCASE", []);
}

export async function setAllowed(db: Db, app: AllowedApp, allowed: boolean): Promise<void> {
  if (allowed) {
    await db.runAsync(
      "INSERT INTO allowed_apps (package_name, label) VALUES (?, ?) ON CONFLICT(package_name) DO UPDATE SET label = excluded.label",
      [app.package_name, app.label],
    );
  } else {
    await db.runAsync("DELETE FROM allowed_apps WHERE package_name = ?", [app.package_name]);
  }
}
