# Tracker

A local-first personal life-tracker for Android, built with Expo. One
flexible system — **trackers**, **entries**, and typed **entry values** —
replaces separate apps for habits, finances, projects, and prayer. Everything
you log stays on your device; there is no backend, no account, and no sync.

## Features

- **Domains & trackers** — five fixed domains (Daily, Religion, Finance,
  Projects, Others) group user-defined trackers by subject matter, while
  each tracker's frequency (daily/occasional) is independent of its domain.
- **Today** — a contribution-graph preview, a fixed checklist of daily
  trackers, and today's activity feed, all on one screen.
- **History** — every entry, grouped by day, filterable by domain, with
  deep links from the graph.
- **Add** — log an entry against an existing tracker, or define a brand new
  tracker (name, domain, frequency, and typed fields) on the fly.
- **Prayer tracker** — a dedicated fard/sunnah log for the five daily
  prayers, with its own contribution-graph brightness rule (fard drives
  fill intensity; sunnah is an independent secondary indicator).
- **Reports** — per-domain totals, tracker trend lines, streaks, a
  Finance category breakdown, and a Projects time-logged summary.
- **Android home-screen widgets** — a contribution-graph widget and a
  project-time widget, each independently configurable, reading straight
  from the same local SQLite database.

## Tech stack

- [Expo](https://expo.dev) (SDK 57) with [Expo Router](https://docs.expo.dev/router/introduction/) for file-based navigation
- [`expo-sqlite`](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/) for local storage — schema + migrations in `src/db/`
- [`@expo/ui`](https://docs.expo.dev/versions/v57.0.0/sdk/ui/) (Jetpack Compose) for native Material You UI on Android
- [`@shopify/react-native-skia`](https://shopify.github.io/react-native-skia/) for the contribution graph and trend charts
- [`react-native-android-widget`](https://saleksovski.github.io/react-native-android-widget/) for home-screen widgets, via an Expo config plugin
- TypeScript in strict mode, [Bun](https://bun.sh) as the package manager

No backend, no analytics, no third-party network calls — see
[`Security.md`](./Security.md).

## Getting started

This app depends on native modules (`expo-sqlite`, `@expo/ui`,
`react-native-android-widget`, Skia) that don't run in Expo Go, so it needs a
local development build.

```bash
bun install
bunx expo prebuild -p android
bun run android   # starts Metro and launches the dev client
```

Other useful commands:

```bash
bun run start        # start the Metro dev server
bun run ios          # start targeting iOS (deferred — see Architecture)
bun run web          # start targeting web
bun run lint         # expo lint (ESLint flat config)
bunx tsc --noEmit     # type-check (strict mode)
```

There is no test suite in this repo yet; verification is static
(`tsc`/`lint`) plus manual on-device checks.

## Architecture

Routing is file-based, rooted at `src/app` (see the `main` entry point and
`expo-router/entry`). Path aliases: `@/*` → `src/*`, `@/assets/*` →
`assets/*`.

```
src/
  app/            routes only — thin wrappers around src/screens
  screens/        screen bodies + colocated private components
  components/     cross-screen reusable UI (contribution graph, trend chart)
  db/             SQLite client, migrations, repositories, seed data
  types/          shared domain types
  lib/            pure logic (dates, contribution-graph math, streaks) —
                  zero React/RN/Skia imports, reused by the widgets
  hooks/          data hooks for screens
  theme/          Material You wrapper + fixed domain color palette
  widgets/        Android home-screen widget renderers + task handler
```

Storage is local SQLite (`domains` → `trackers` → `tracker_fields`, plus
`entries`/`entry_values`; `routines`/`goals`/`projects` round out the
schema). The prayer tracker is a UI special case built on the same
standard schema, not a fork of it — see `src/db/seed.ts` and
`src/lib/contribution-graph.ts`.

iOS support is deferred; the Android-only pieces (`@expo/ui/jetpack-compose`,
the widget plugin) are isolated behind platform-file splits
(`.android.tsx`) so a SwiftUI pass can be added later without a rewrite.

## Contributing

See [`Contributing.md`](./Contributing.md).

## Security

See [`Security.md`](./Security.md) for the threat model and how to report a
vulnerability.

## License

[MIT](./LICENSE)
