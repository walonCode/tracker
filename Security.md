# Security Policy

## Data model and threat model

Focus is a local-first, offline app with no backend, no accounts, and no server component.

- All data (goal, tasks, plan items, sessions, allowed apps, settings) lives in one on-device SQLite database, `focus.db`, created and migrated by `src/db/client.ts`.
- The app makes no network requests and ships no analytics or telemetry SDK.
- There is no cloud sync. Plan 7 adds a user-initiated JSON export through the system share sheet and Android Auto Backup of the database.

Points worth attention:

- **Device-level access.** The database is unencrypted. Anyone with filesystem access to the device (root, a device backup, an insufficiently sandboxed app) can read it.
- **SQL injection.** Every repo query binds values with `?` placeholders. The only interpolated value is the internal integer in `PRAGMA user_version`.
- **Focus mode permissions (plan 5).** Blocking requires Usage Access, Display over other apps, Do Not Disturb access, and phone state. These are used only during a user-started session and only on the device.

## Supported versions

This is a single-maintainer personal project with no formal release process. Security fixes land on `main`; there are no back-ported patches to older tags.

## Reporting a vulnerability

If you find a security issue (for example a SQL injection path, a way for another app to read this app's data, or anything that lets data leave the device), report it privately rather than in a public issue:

- Email **mohamedlaminwalonjalloh@gmail.com** with a description and, if possible, reproduction steps.
- If GitHub private vulnerability reporting is enabled, use the "Report a vulnerability" button under the repository's Security tab.

Do not open a public issue until a fix has been released. There is no bug bounty; reports are credited in the fix's commit unless you prefer otherwise.
