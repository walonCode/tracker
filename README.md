# Focus

A local-first Android focus app built with Expo. The user sets one goal, plans tomorrow's tasks with a fixed amount and time limit, and runs each task as a timed session. During a session the app silences notifications (calls still ring) and blocks every app that is not on an allowed list. Everything stays on the device: no backend, no account, no analytics, no network calls.

The app is built in seven plans, `docs/plan1.md` to `docs/plan7.md`. Each plan lists its dependencies, rules, tests, and acceptance checks.

| Plan | Scope | Status |
| --- | --- | --- |
| 1 | Foundation: theme, navigation shell, database, migrations, date utilities | Done |
| 2 | Goal and first run | Done |
| 3 | Tasks and planning | Pending |
| 4 | Session engine and Today | Pending |
| 5 | Android focus mode (native module) | Pending |
| 6 | Log and statistics | Pending |
| 7 | Hardening and release | Pending |

## Tech stack

- [Expo](https://expo.dev) SDK 57 with [Expo Router](https://docs.expo.dev/router/introduction/), development build only (plan 5 adds native code, so Expo Go is not supported)
- [React Native Paper](https://callstack.github.io/react-native-paper/) (Material 3), light and dark themes following the system setting
- [`expo-sqlite`](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/) for storage, `expo-keep-awake` and `expo-audio` for sessions
- Jest via `jest-expo`; database tests run against Node's built-in SQLite
- TypeScript in strict mode, [Bun](https://bun.sh) as the package manager

## Getting started

```bash
bun install
bunx expo prebuild -p android
bun run android      # builds and launches the dev client
```

Checks (all three must pass before a plan is merged):

```bash
bun run typecheck
bun run lint
bun run test
```

In development builds the database is seeded once with one goal, four tasks, and 84 days of plan items and sessions (`src/dev/seed.ts`). Set `EXPO_PUBLIC_DEV_SEED=0` to start from an empty database.

## Architecture

```
app/                    expo-router routes (screens only, no logic)
src/db/                 client, migrations, repos
src/domain/             pure functions: clock, dates, labels, session math
src/features/           feature components and hooks, one folder per plan
src/components/         shared UI (ScreenBar)
src/theme/              Material 3 theme
src/dev/                seed data, dev only
modules/focus-mode/     Kotlin module (plan 5)
test/                   test helpers
```

- Time: every timestamp is integer Unix seconds; every date is a local `YYYY-MM-DD` string; the day boundary is local midnight. Code reads the time only through `src/domain/clock.ts`, so tests can fix it.
- Migrations are an ordered array of SQL strings in `src/db/migrations.ts`, applied above `PRAGMA user_version`, one transaction each.
- Repos are plain async functions that take a `Db` handle (`src/db/types.ts`), a subset of the expo-sqlite API. Tests pass a Node SQLite implementation of the same interface (`test/nodeDb.ts`).
- Navigation is a single stack with hidden headers. Every screen renders `ScreenBar`. There is no tab bar and no drawer.
- Android only in v1. All code is platform neutral except `modules/focus-mode`.

## Contributing

See [`Contributing.md`](./Contributing.md).

## Security

See [`Security.md`](./Security.md).

## License

[MIT](./LICENSE)
