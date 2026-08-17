# Contributing

Thanks for taking a look at Tracker. This is a personal, local-first
life-tracker app — small and opinionated, so please open an issue to
discuss any non-trivial change before sending a PR.

## Setup

This repo uses [Bun](https://bun.sh), not npm/yarn.

```bash
bun install
bunx expo prebuild -p android
bun run android
```

`expo-sqlite`, `@expo/ui`, `@shopify/react-native-skia`, and
`react-native-android-widget` are all native modules — none of them run in
Expo Go, so you need a local dev build (Android Studio + an emulator or a
physical device). There is no EAS/CI build for this project.

## Before opening a PR

```bash
bunx tsc --noEmit   # type-check, strict mode
bun run lint         # expo lint
```

There is no automated test suite yet. Manually verify the screen(s) you
touched on-device or in an emulator — type-checking and linting catch
syntax/type errors, not rendering or native-binding regressions.

## Project conventions

These are load-bearing, not stylistic — please follow them:

- **Expo has changed significantly as of v57.** Check the versioned docs at
  <https://docs.expo.dev/versions/v57.0.0/> before relying on older/general
  React Native or Expo knowledge, especially for `expo-router` and
  `@expo/ui`.
- **`src/lib/` stays pure.** No React, React Native, or Skia imports.
  `contribution-graph.ts` in particular is shared verbatim between the
  in-app Skia renderer and the headless Android widget — a second
  implementation there is a bug, not a feature.
- **`@expo/ui` import discipline.** `Host` always imports from the
  universal `@expo/ui` root. Anything importing `@expo/ui/jetpack-compose`
  directly is Android-only, must be a `.android.tsx` file, and must live
  outside `src/app` (Expo Router doesn't allow platform-extension route
  files). See the vendored `expo-ui` skill under `.agents/skills` for the
  full split pattern.
- **Domains are fixed.** The five domains (Daily, Religion, Finance,
  Projects, Others) are seeded once in `src/db/seed.ts` and are not
  user-creatable — don't add a "create domain" flow. Users create
  trackers and fields, not domains.
- **The prayer tracker is a UI special case, not a schema fork.** It's an
  ordinary `entries`/`entry_values` tracker with `kind: "prayer"` and ten
  boolean fields (`{prayer}_fard` / `{prayer}_sunnah`). Brightness in the
  contribution graph comes only from the five fard fields; sunnah is
  always a separate, non-blended secondary indicator
  (`computePrayerDailyIntensity` in `src/lib/contribution-graph.ts`).
- **SQL is always parameterized.** Every repository function in
  `src/db/repositories/` binds parameters — never string-interpolates a
  value into a query.
- **Migrations are additive.** Add a new `NNN_description.ts` file under
  `src/db/migrations/` and append it to the array in `migrations/index.ts`;
  never edit a migration that's already shipped.

## Commit messages

- Write commit messages that explain *why*, not just *what*.
- **Never add a `Co-Authored-By` trailer**, including from AI coding tool
  templates — this applies to every commit in this repo, no exceptions.

## Reporting bugs / suggesting features

Open a GitHub issue with clear repro steps (for bugs) or the problem
you're trying to solve (for features). Since this is a single-maintainer
personal project, response time may be slow.

For security issues, see [`Security.md`](./Security.md) instead of a
public issue.
