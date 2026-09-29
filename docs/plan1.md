# Plan 1: Foundation

Depends on: nothing.
Mockup screens: none. This plan builds the shell only.
Outcome: a debug build runs on an Android device with the theme, navigation shell, database, migrations, and tested date utilities. No feature screens.

## Decisions fixed here

- Stack: Expo (current SDK at project start), TypeScript in strict mode, expo-router, React Native Paper (Material 3), expo-sqlite, expo-keep-awake, expo-audio, jest-expo for tests.
- Development build, not Expo Go. Plan 5 adds native code, so Expo Go cannot be used past this point.
- Android only in v1. Keep all code platform neutral except `modules/focus-mode`, which plan 5 creates.
- Storage is local SQLite. No backend, no accounts, no analytics, no network calls.
- Time: every timestamp is Unix seconds stored as an integer. Every date is a local `YYYY-MM-DD` string. The day boundary is local midnight.
- Do not commit the `android/` folder. Native config comes from config plugins (continuous native generation), so plan 5 stays reproducible.

## Folder layout

```
app/                    expo-router routes (screens only, no logic)
src/db/                 client, migrations, repos
src/domain/             pure functions: dates, labels, session math, run counter
src/features/           feature components and hooks, one folder per plan
src/theme/              Material 3 theme
src/dev/                seed data, dev only
modules/focus-mode/     Kotlin module (created in plan 5)
```

## Steps

1. Create the project with the blank TypeScript template. Set `"strict": true` and a path alias `@/` for `src/`.
2. Install: react-native-paper, react-native-safe-area-context, react-native-vector-icons alternative that Paper supports on Expo (`@expo/vector-icons`), expo-sqlite, expo-keep-awake, expo-audio, expo-router, jest-expo, eslint, prettier.
3. Run prebuild for Android and a first `expo run:android` to confirm a dev client installs and launches.
4. Theme in `src/theme/index.ts`: Material 3 light and dark, following the system setting. Primary `#4a5bd0` (light) and `#b9c3ff` (dark), matching the mockups. Export one hook, `useAppTheme()`.
5. Router: `app/_layout.tsx` wraps PaperProvider and a DatabaseProvider. Stack navigator with headers hidden. Build one shared component, `ScreenBar` (back arrow, title, optional right-side action slot), used by every screen. No tab bar and no drawer anywhere in the app.
6. `app/index.tsx` is a placeholder for Today.
7. Database client in `src/db/client.ts`: open `focus.db`, run `PRAGMA foreign_keys = ON` and `PRAGMA journal_mode = WAL`.
8. Migrations in `src/db/migrations.ts`: an ordered array of SQL strings. On startup read `PRAGMA user_version`, apply every migration above it inside one transaction each, then set the new version. Migration 1 is the schema below.
9. Repositories in `src/db/repos/`: `goals.ts`, `tasks.ts`, `planItems.ts`, `sessions.ts`, `settings.ts`, `allowedApps.ts`. Each exports plain async functions that take the database handle. In this plan write only `settings` (get, set) and empty typed signatures for the rest.
10. Clock in `src/domain/clock.ts`: `nowSeconds()` reads a replaceable source so tests can fix the time.
11. Date utilities in `src/domain/dates.ts`: `localDate(seconds)`, `today()`, `addDays(date, n)`, `weekdayOf(date)` (Monday is 0), `mondayOf(date)`, `daysBetween(a, b)`, `formatDuration(seconds)` (for example `1 h 35 min`, `38:12`).
12. Scripts: `typecheck`, `lint`, `test`. All three must pass before any later plan starts.
13. Dev seed in `src/dev/seed.ts`, gated by `__DEV__`: one goal, four tasks, and 84 days of plan items with sessions. Plan 6 needs it.

## Schema (migration 1)

```sql
CREATE TABLE goals (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active','completed','dropped')),
  drop_reason TEXT,
  created_at INTEGER NOT NULL,
  closed_at INTEGER
);
CREATE UNIQUE INDEX one_active_goal ON goals(status) WHERE status = 'active';

CREATE TABLE tasks (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  detail TEXT,
  amount INTEGER NOT NULL CHECK (amount > 0),
  unit TEXT NOT NULL CHECK (unit IN ('pages','verses','words','sets','papers','min')),
  cursor INTEGER,
  default_minutes INTEGER NOT NULL CHECK (default_minutes IN (15,30,50,90)),
  goal_id INTEGER REFERENCES goals(id),
  start_time TEXT,
  archived_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE repeat_days (
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  PRIMARY KEY (task_id, weekday)
);

CREATE TABLE plan_items (
  id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  plan_date TEXT NOT NULL,
  position INTEGER NOT NULL,
  label_snapshot TEXT NOT NULL,
  limit_minutes INTEGER NOT NULL,
  target_amount INTEGER NOT NULL,
  done_amount INTEGER NOT NULL DEFAULT 0,
  used_seconds INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','done','skipped','dropped')),
  completed_at INTEGER,
  UNIQUE (task_id, plan_date)
);
CREATE INDEX plan_items_date ON plan_items(plan_date);

CREATE TABLE sessions (
  id INTEGER PRIMARY KEY,
  plan_item_id INTEGER NOT NULL REFERENCES plan_items(id),
  state TEXT NOT NULL CHECK (state IN ('running','paused','ended')),
  is_open INTEGER CHECK (is_open = 1),
  started_at INTEGER NOT NULL,
  resumed_at INTEGER,
  ended_at INTEGER,
  active_seconds INTEGER NOT NULL DEFAULT 0,
  end_reason TEXT CHECK (end_reason IN ('limit','finished','stopped','early_exit')),
  finished TEXT CHECK (finished IN ('yes','partly')),
  amount_done INTEGER,
  cursor_from INTEGER,
  cursor_to INTEGER,
  note TEXT
);
CREATE UNIQUE INDEX one_open_session ON sessions(is_open);

CREATE TABLE allowed_apps (
  package_name TEXT PRIMARY KEY,
  label TEXT NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

`is_open` is 1 while a session is running or paused and NULL once it ends. SQLite treats NULLs as distinct in a unique index, so at most one session can be open at any time.

`label_snapshot` freezes the task sentence at planning time, so editing a task later never rewrites old log entries.

## Tests

- `localDate` around midnight and across a timezone offset.
- `addDays` across month and year ends.
- `mondayOf` and `weekdayOf` for a full week.
- `formatDuration` for 0, 59, 60, 3599, 3600, and 5700 seconds.
- Migration test: a fresh database reaches `user_version` 1, and running migrations twice changes nothing.
- Constraint test: inserting a second active goal fails; inserting a second open session fails.

## Acceptance

- `npm run typecheck`, `lint`, and `test` pass.
- The app launches on a physical Android device and shows the placeholder.
- Toggling the system dark mode changes the theme without a restart.
- Killing and reopening the app keeps the seeded data.