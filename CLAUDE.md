# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `bun install` — install dependencies (repo uses `bun.lock`, not npm/yarn)
- `bun run start` — start the Expo dev server (Metro)
- `bun run android` / `bun run ios` / `bun run web` — start the dev server targeting a specific platform
- `bun run lint` — lint via `expo lint` (ESLint config is not yet scaffolded in the repo; first run will offer to create it)
- `bun run reset-project` — runs `scripts/reset-project.js` to move starter code to `app-example/` and reset `src/app` to a blank slate (destructive; only run when intentionally starting over)

There is no test suite configured in this repo yet.

## Architecture

This is an Expo Router (v57) app using file-based routing rooted at `src/app` (not the default `app/` — see the `main: "expo-router/entry"` + project layout). Routes are TypeScript files under `src/app`; `_layout.tsx` defines the root navigator (currently a bare `Stack`).

Path aliases (`tsconfig.json`): `@/*` → `src/*`, `@/assets/*` → `assets/*`.

Key config:
- `app.json` — Expo app config. `typedRoutes` and `reactCompiler` experiments are enabled.
- `tsconfig.json` extends `expo/tsconfig.base` with `strict: true`.

The project is presently a minimal scaffold (only `src/app/_layout.tsx` and `src/app/index.tsx` exist) — most of the original `create-expo-app` template (themed components, hooks, example tabs) has been removed in favor of a from-scratch build.

Expo skills for this repo are vendored under `.agents/skills` and symlinked into `.claude/skills` (tracked via `skills-lock.json`): `expo-router`, `expo-ui`, `expo-native-ui`, `expo-project-structure`, `expo-tailwind-setup`. Prefer these skills over generic React Native knowledge when working on routing, native UI, or project layout in this repo.

**Important:** Expo has changed significantly as of v57. Always check the versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing Expo/React Native code — do not rely on older/general knowledge of Expo APIs.
