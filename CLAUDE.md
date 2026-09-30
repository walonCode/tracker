# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `bun install`: install dependencies (repo uses `bun.lock`, not npm/yarn)
- `bun run start`: start the Expo dev server (Metro)
- `bun run android`: build and launch the Android dev client
- `bun run typecheck`: `tsc --noEmit` (strict mode)
- `bun run lint`: `expo lint` (ESLint flat config in `eslint.config.js`)
- `bun run test`: Jest via `jest-expo`
- `bun run test src/domain/__tests__/dates.test.ts` or `bun run test -t "name"`: run one test file or test by name
- `bun run format`: Prettier
- `bunx expo prebuild -p android`: regenerate the gitignored `android/` native project

Typecheck, lint, and test must all pass before a plan is merged. Tests cover only domain functions and repos; screens are verified by hand on a device. The app runs only in a development build (Expo Go is not supported, since plan 5 adds a native module).

**Never add a `Co-Authored-By` trailer to commit messages in this repo** (including when pushing), regardless of any default tool template that suggests one.

## Architecture

The repo pivoted from a life-tracker app to **Focus**, a local-first Android focus app (goal, planned tasks with amounts and time limits, timed sessions, app blocking). The build is split into seven plans in `docs/plan1.md` to `docs/plan7.md`; each plan lists its rules, tests, and acceptance checks. Read the relevant plan before working on a feature, and do not add anything that is not in the plans.

Routing is file-based, rooted at `app/` (repo root, not `src/app`). Route files are one-line re-exports of screens from `src/features/<feature>/`; logic lives in the feature folder. Navigation is a single `Stack` with hidden headers; `app/_layout.tsx` wraps it in `GestureHandlerRootView` → `PaperProvider` → `DatabaseProvider`. `useOnboardingRedirect` holds the splash screen until it has checked the saved onboarding step and redirected an unfinished first run. Path aliases (`tsconfig.json`): `@/*` → `src/*`, `@/assets/*` → `assets/*`.

- `src/db/`: `client.ts` (pragmas + migrations), `migrations.ts` (ordered SQL strings over `PRAGMA user_version`), `DatabaseProvider.tsx` (wraps `SQLiteProvider`, exposes `useDb()`), `repos/` (plain async functions taking a `Db`). Plan items dated today or earlier are locked (`PlanLockedError`); they change only through the session engine or Skip today. Repos for plans not yet built are typed stubs that call `notImplemented()`; implement them in place when their plan lands.
- `src/db/types.ts`: the `Db` interface (subset of expo-sqlite's `SQLiteDatabase`) and row types. Tests run repos against `test/nodeDb.ts` (Node's built-in `node:sqlite`); `jest.global-setup.js` pins `TZ` to America/New_York.
- `src/domain/`: pure functions only (no React, React Native, or database imports). Read time only through `clock.ts` (`nowSeconds()`), never `Date.now()`; tests freeze time with `setClockSource()`.
- `src/theme/`: React Native Paper Material 3 theme, `useAppTheme()`.
- `src/components/ScreenBar.tsx`: the top bar used by every screen. No tab bar, no drawer.
- `src/dev/seed.ts`: dev-only seed, run once from `DatabaseProvider` when `__DEV__` and `EXPO_PUBLIC_DEV_SEED` is not `0`.

Data conventions:
- Timestamps are integer Unix seconds; dates are local `YYYY-MM-DD` strings; the day boundary is local midnight.
- SQL is always parameterized with `?` (the only exception is `PRAGMA user_version`).
- Migrations are append-only: add a new SQL string to the end of `migrations.ts`, never edit a shipped one. Each runs in its own transaction.
- `client.ts` enables `foreign_keys` and WAL per connection before migrating.

Key config:
- `app.json`: `android.package` is `com.walonfoundation.tracker` (kept from before the pivot so the EAS project link survives); `scheme` is `focusapp`. `typedRoutes` and `reactCompiler` experiments are enabled.
- `tsconfig.json` extends `expo/tsconfig.base` with `strict: true` and `types: ["jest"]`.

Expo skills are vendored under `.agents/skills` and symlinked into `.claude/skills` (tracked via `skills-lock.json`). Prefer them over generic React Native knowledge for routing and project layout.

**Important:** Expo has changed significantly as of v57. Always check the versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing Expo/React Native code.
