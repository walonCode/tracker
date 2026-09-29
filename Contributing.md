# Contributing

Focus is a small, single-maintainer personal project. Open an issue to discuss any non-trivial change before sending a PR.

## Setup

This repo uses [Bun](https://bun.sh), not npm or yarn.

```bash
bun install
bunx expo prebuild -p android
bun run android
```

The app runs only in a development build (Android Studio with an emulator, or a physical device). Expo Go is not supported.

## Before opening a PR

```bash
bun run typecheck
bun run lint
bun run test
```

All three must pass. Tests cover pure domain functions and repos (run against Node's built-in SQLite); verify screens by hand on a device.

## Project conventions

- **Follow the plans.** Work maps to one of `docs/plan1.md` to `docs/plan7.md`. Nothing is added that is not in the plans.
- **Expo has changed as of v57.** Check <https://docs.expo.dev/versions/v57.0.0/> before relying on older Expo or React Native knowledge.
- **Time goes through the clock.** Timestamps are integer Unix seconds and dates are local `YYYY-MM-DD` strings. Read the time with `nowSeconds()` from `src/domain/clock.ts`, never `Date.now()`, so tests can fix it.
- **`src/domain/` stays pure.** No React, React Native, or database imports.
- **SQL is always parameterized.** Repos bind every value with `?`. The one exception is `PRAGMA user_version`, which takes an internal integer.
- **Migrations are append-only.** Add a new SQL string to the end of `src/db/migrations.ts`; never edit one that has shipped.

## Commit messages

- Explain why, not only what.
- **Never add a `Co-Authored-By` trailer**, including from AI coding tool templates.

## Reporting bugs

Open a GitHub issue with reproduction steps. For security issues, see [`Security.md`](./Security.md) instead of a public issue.
