# Plan 7: Hardening and release

Depends on: plans 1 to 6.
Mockup screens: none new. This plan adds start-time reminders, backup and export, the home-screen widget, quality checks, and the Play Store release.
Outcome: a version 1 build on the Play internal testing track that you have used for seven consecutive days.

## 1. Start-time reminders

- Package: expo-notifications, local notifications only.
- A task with a `start_time` and repeat days produces one notification at that time on each planned day. Channel: "Task start", low importance, no vibration, short sound off.
- Schedule from `plan_items` for the next 7 days, not from the repeat rule directly, so skipped and dropped items produce nothing. Rebuild the schedule on: plan save, app start, task edit, and task archive.
- Request `POST_NOTIFICATIONS` the first time a start time is set, not at first launch.
- Tapping the notification opens Today with that item as the Next card.
- No other notifications exist besides this one and the foreground service notification from plan 5.

## 2. Backup and export

- Enable Android Auto Backup and add `fullBackupContent` rules that include the SQLite database and exclude caches.
- Export data (Today overflow menu): writes one JSON file containing every table, with a `schemaVersion` field, then opens the system share sheet.
- Import: available only when the database has no plan items and no sessions. Validates `schemaVersion`, inserts inside one transaction, and rolls back on any error.
- Test with a round trip: export from the seeded database, wipe, import, and compare table row counts and a checksum of the log query results.

## 3. Home-screen widget

- Native AppWidget in `modules/focus-mode`, one size (4x1): the Next task label and a Start button.
- The button opens a deep link, `focusapp://start-next`, which starts the Next item and lands on the Session screen.
- The widget refreshes on plan save, session end, and once at midnight. If no task is planned, it shows "Nothing planned".
- Treat the widget as optional. Cut it first if the schedule slips.

## 4. Quality pass

- Copy sweep against the content rules: sentence case everywhere, no exclamation marks, no "please", buttons start with a verb, errors say what happened and what to do.
- Accessibility: TalkBack labels on every control, font scale at 200% without clipped text, touch targets at least 48 dp, contrast in both themes.
- Performance: cold start under 2 seconds on a low-end device; Log with 365 days of data opens under one second. Measure and record the numbers.
- Reliability: a 60 minute session with the screen off on two device brands; airplane mode on for a full day (the app must behave identically, since it never uses the network).
- Edge cases to test by hand: change the device timezone during a session, change the date manually, midnight rollover during a session (the session belongs to the plan item's date), low storage, and a rotated screen.

## 5. Release steps

1. Set the application id, version code, and icon (a plain monochrome mark; adaptive icon with a flat background). No splash animation.
2. Build a signed release with EAS Build. Keep the keystore backup outside the repository.
3. Write a one-page privacy policy: all data stays on the device, no network access, no analytics, no accounts.
4. Play Console declarations: Data safety form (no data collected or shared), the foreground service `specialUse` explanation, the Usage Access and overlay permission justifications (core function: blocking distracting apps during a user-started session), and the battery optimization exemption justification.
5. Upload to the internal testing track and install from the Play link on your own device.
6. Start the 7 day self-use trial. Keep a plain text list of every defect and every moment the app itself distracted you.

## 6. iOS start (calendar item, not a build item)

Apply for Apple's Family Controls entitlement during the first week of this plan. Approval takes time and gates the iOS blocking feature. The iOS build itself is a separate later plan: same SQLite schema and domain code, native iOS styling, and app blocking through the Screen Time API.

## Definition of done for version 1

- Plans 1 to 6 acceptance lists all pass on the release build.
- Seven consecutive days of real use with no lost session, no stuck Do Not Disturb, and no crash.
- Every defect from the trial is fixed or written down as deferred with a reason.
- Nothing has been added to the app that is not in these seven plans.