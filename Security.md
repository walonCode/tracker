# Security Policy

## Data model and threat model

Tracker is a **local-first, offline app with no backend**. There is no
account system, no authentication, and no server component:

- All data (domains, trackers, entries, prayer logs, projects, widget
  configuration) lives in a single on-device SQLite database
  (`expo-sqlite`), created and migrated by `src/db/client.ts`.
- The app makes **no network requests** — there is no `fetch`, HTTP
  client, or analytics/telemetry SDK anywhere in `src/`. Nothing you log
  ever leaves your device.
- There is no cloud sync, export-to-server, or third-party data sharing.

Given that, the app's attack surface is deliberately small. The main
things worth caring about:

- **Device-level access.** Since data is unencrypted SQLite on-device (no
  app-level encryption layer), anyone with access to the device's
  filesystem (root access, a physical device backup, a malicious app with
  storage permissions on an insufficiently sandboxed device) can read the
  database file directly. This mirrors the OS's own storage security
  guarantees for any local-only Android app; there's no additional
  encryption-at-rest in this project today.
- **SQL injection.** Every query in `src/db/repositories/` uses
  parameterized statements (`db.runAsync`/`getFirstAsync`/`getAllAsync`
  with bound `?` placeholders) — never raw string interpolation of
  user-provided values into SQL. `PRAGMA` statements are the one exception
  (SQLite doesn't support bound parameters there), and the only values
  ever interpolated into a `PRAGMA` string are internal integer literals
  (migration version numbers), never user input.
- **Widget surface.** The Android home-screen widgets
  (`react-native-android-widget`) read the same local database from a
  headless task handler with no separate network or IPC surface beyond
  what the OS's widget framework itself provides.

## Supported versions

This is a single-maintainer personal project with no formal release/LTS
process. Security fixes land on `main`; there are no back-ported patches
to older tags.

## Reporting a vulnerability

If you find a security issue (e.g. a SQL injection path, a way for one
widget/component to read another app's data, or anything that would let
data leave the device unexpectedly), please report it privately rather
than opening a public issue:

- Email **mohamedlaminwalonjalloh@gmail.com** with a description and, if
  possible, reproduction steps.
- If the repository has GitHub's private vulnerability reporting enabled,
  you can also use the "Report a vulnerability" button under the
  repo's Security tab.

Please don't open a public GitHub issue for security reports until a fix
has been released — this gives the maintainer time to respond before
details are public.

There's no bug bounty program; this is a hobby project, but reports are
genuinely appreciated and will be credited in the fix's commit/changelog
unless you'd prefer otherwise.
