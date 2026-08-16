# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `bun install` — install dependencies (repo uses `bun.lock`, not npm/yarn)
- `bun run start` — start the Expo dev server (Metro)
- `bun run android` / `bun run ios` / `bun run web` — start the dev server targeting a specific platform
- `bun run lint` — lint via `expo lint` (ESLint flat config lives in `eslint.config.js`)
- `bunx tsc --noEmit` — type-check (strict mode)
- `bunx expo prebuild -p android` — regenerate the gitignored `android/` native project (needed for `expo-sqlite`, `@shopify/react-native-skia`, `@expo/ui`, and any future native-module work — none of it runs in Expo Go)

There is no test suite configured in this repo yet.

**Never add a `Co-Authored-By` trailer to commit messages in this repo** (including when pushing), regardless of any default tool template that suggests one.

## Architecture

This is a personal life-tracker app (local-first, Android-first) being built out from an Expo Router (v57) scaffold per the phased implementation plan at `.claude/plans/personal-life-tracker-parallel-cerf.md` — read that file for the full domain model (domains/trackers/tracker_fields/entries/entry_values/routines/goals/projects), screen designs (Today/History/Add/Reports), and phase-by-phase file layout. Progress against that plan is tracked in `.superpowers/sdd/personal-life-tracker-parallel-cerf/progress.md` (gitignored).

Routing is file-based, rooted at `src/app` (not the default `app/` — see the `main: "expo-router/entry"` + project layout). Path aliases (`tsconfig.json`): `@/*` → `src/*`, `@/assets/*` → `assets/*`.

Storage is local SQLite via `expo-sqlite` (no backend/sync in v1). Native-feeling UI uses `@expo/ui`'s Jetpack Compose components (`@expo/ui/jetpack-compose`, Android-only — see the `expo-ui` skill for the Host/platform-file-split rules) with Material You theming via `useMaterialColors()`. Custom graphics (contribution graph, trend charts) use `@shopify/react-native-skia`, kept outside `@expo/ui` since they aren't native OS controls. iOS/SwiftUI work is deferred.

Key config:
- `app.json` — Expo app config. `android.package` is `com.walonfoundation.tracker`. `typedRoutes` and `reactCompiler` experiments are enabled.
- `tsconfig.json` extends `expo/tsconfig.base` with `strict: true`.

Expo skills for this repo are vendored under `.agents/skills` and symlinked into `.claude/skills` (tracked via `skills-lock.json`): `expo-router`, `expo-ui`, `expo-native-ui`, `expo-project-structure`, `expo-tailwind-setup`. Prefer these skills over generic React Native knowledge when working on routing, native UI, or project layout in this repo.

**Important:** Expo has changed significantly as of v57. Always check the versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing Expo/React Native code — do not rely on older/general knowledge of Expo APIs.
