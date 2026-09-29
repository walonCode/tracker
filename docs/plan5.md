# Plan 5: Android focus mode

Depends on: plans 1 to 4.
Mockup screens: 2 (Permissions), 3 (Allowed apps), 9 (Blocked app opened), plus the status line on 8.
Outcome: starting a session silences notifications (calls still ring), blocks every app that is not on the allowed list, survives the app being killed, and pauses the timer during phone calls.

## Native module: `modules/focus-mode` (Kotlin, Expo Modules API)

Exposed functions (TypeScript wrapper in `src/features/focus/focusMode.ts`):

- Permission checks and openers: `hasDndAccess`, `openDndSettings`, `hasUsageAccess`, `openUsageSettings`, `hasOverlayPermission`, `openOverlaySettings`, `isIgnoringBatteryOptimizations`, `requestIgnoreBatteryOptimizations`, `hasPhoneStatePermission`.
- `listLaunchableApps()`: returns `{ packageName, label }` for apps with a launcher entry.
- `startFocus({ title, endsAtMs, allowedPackages })` and `stopFocus()`.
- `getCallIntervals(sinceMs)`: returns `{ startMs, endMs }[]` recorded while focus was on.
- Events: `onBlocked` (a blocked app was intercepted).

## Foreground service

- One foreground service, started by `startFocus`, stopped by `stopFocus` or when `endsAtMs` passes. Declare the service type `specialUse` with a property that describes the purpose ("blocks distracting apps during a user-started focus session").
- It shows one persistent, low-importance notification (Android requires it): the task title and the end time. Nothing else. Request `POST_NOTIFICATIONS` on Android 13 and above when the first session starts.
- The service owns the timing that must survive the app process dying: end sound, block detection, and call tracking.

## Do Not Disturb

- On start, save the current interruption filter to SharedPreferences, then apply a priority-only policy that allows calls from anyone (`PRIORITY_CATEGORY_CALLS`, senders `ANY`) and nothing else, and set the filter to priority.
- On stop, restore the saved filter.
- Reconcile on every app start: if a flag says focus applied DND but no service is running, restore the filter. This covers crashes and reboots.

## Block detection and the block screen

- Poll `UsageStatsManager.queryEvents` about once per second for the latest foreground event.
- Always allowed: this app, the default dialer and in-call UI (resolve with `TelecomManager.getDefaultDialerPackage`), System UI, the active input method, and the current launcher. The user's list adds to these.
- When a foreground package is not allowed, the service starts this app's main activity with an extra that opens the `/blocked` route. Because the app holds the overlay permission, Android allows the background activity start. The block screen is a normal React Native screen (screen 9), not a native overlay, so it matches the rest of the UI.
- `/blocked` shows: "Session running", the task title, the remaining time (from the clock), Back to session (filled), and End session. End session waits behind a 10 second countdown and a confirm ("Still want to end?"). Ending this way sets `end_reason = early_exit`, which the log will show.
- Add `<queries>` for the launcher intent in the manifest so `listLaunchableApps` works without `QUERY_ALL_PACKAGES`, which Play restricts.

## Call handling

- Register a telephony callback (`TelephonyCallback` on API 31 and above, `PhoneStateListener` below) inside the service.
- Record each call as `{ startMs, endMs }` in SharedPreferences. JavaScript may be suspended during a call, so it must not receive the pause; it reads the intervals on resume.
- The session engine passes the total overlap between call intervals and the session as `pausedMs` into `elapsed` (plan 4), and stores the adjusted `active_seconds` on stop. This makes the timer effectively pause during calls.
- Requires the `READ_PHONE_STATE` runtime permission.

## End sound

The service plays one short tone at `endsAtMs` with `AudioAttributes.USAGE_ALARM` so Do Not Disturb does not silence it. The Session done screen appears on next foreground.

## Screens

**Permissions (screen 2).** Four rows: Do Not Disturb access, Usage access, Display over other apps, and Battery optimization ("Keep running during sessions"). Each row opens the relevant system settings screen. Statuses refresh on every `AppState` change to active. Continue is always enabled. Also reachable later from Today overflow, Session settings.

**Allowed apps (screen 3).** Phone is fixed and locked on. The list shows installed launchable apps with switches, sorted with enabled apps first. Store choices in `allowed_apps`. Also reachable from Session settings.

**Session screen (screen 8).** When focus is on, the status line reads "Do Not Disturb on, calls allowed". If a permission is missing, show one small line, "Blocking is off, permissions missing", tapping it opens Session settings. Never block starting a session because of a missing permission.

## Expo config plugin

Write `plugins/withFocusMode.ts` that adds to the manifest: `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_SPECIAL_USE`, `POST_NOTIFICATIONS`, `ACCESS_NOTIFICATION_POLICY`, `PACKAGE_USAGE_STATS`, `SYSTEM_ALERT_WINDOW`, `READ_PHONE_STATE`, `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`, the service declaration, and the launcher `<queries>` entry.

## Test matrix (physical devices)

1. Start a session: notifications silenced, an incoming call rings and can be answered.
2. Open a blocked app: the block screen appears within about one second. Open an allowed app: nothing happens.
3. Kill the app from recents during a session: blocking continues, the timer is correct on reopen.
4. Reboot during a session: on next launch DND is restored and the session is reconciled.
5. Take a 5 minute call: the timer excludes it.
6. Repeat 1 to 3 on at least one Tecno or Infinix phone and one Samsung or Xiaomi phone. Confirm the battery exemption keeps the service alive with the screen off for 30 minutes.

## Risks and fallbacks

- Google Play reviews Usage Access and overlay use. Blocking is the core feature, so declare it as such in the Play Console. If a review rejects it, distribute the APK directly for personal use.
- If a brand kills the service anyway, the session timer still stays correct (timestamps), and only blocking degrades. Show the "Blocking is off" line if the service heartbeat is stale.

## Acceptance

- All six test-matrix items pass on at least two device brands.
- DND is always restored, including after a forced crash.
- With no permissions granted, the app still runs sessions as a plain timer.