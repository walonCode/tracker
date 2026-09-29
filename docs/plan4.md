# Plan 4: Session engine and Today

Depends on: plans 1 to 3.
Mockup screens: 7 (Today), 8 (Session), 10 (Session done).
Outcome: the daily loop works end to end without any blocking: start a task, run the timer inside its limit, stop or reach the limit, answer the finish check, and see the marker move. This is the first version worth using on yourself.

## Time model (`src/domain/sessionMath.ts`)

All functions are pure and take `now` as a parameter.

- `elapsed(session, now)` returns `active_seconds + (now - resumed_at)` while the session is running, and `active_seconds` while it is paused or ended.
- `usedToday(planItem, openSession, now)` returns `used_seconds + elapsed(openSession)`.
- `remaining(planItem, openSession, now)` returns `max(0, limit_minutes * 60 - usedToday)`.
- Never store a running counter. Store `resumed_at` and derive the display from the clock, so an app kill or a reboot cannot lose time.
- `elapsed` accepts an optional `pausedMs` adjustment. Plan 5 uses it to subtract phone-call time.

## Session lifecycle (`src/domain/session.ts` and `sessions.ts` repo)

- `start(planItemId)`: fails if any session is open (the `one_open_session` index also guarantees it). Inserts a `running` row with `is_open = 1`, `started_at = resumed_at = now`.
- `stop(sessionId, reason)`: computes `active_seconds`, sets `ended_at`, sets `is_open` to NULL, adds the elapsed seconds to `plan_items.used_seconds`, and records `end_reason` (`stopped` or `limit`).
- `pause` and `resume`: internal, used only by plan 5 for phone calls. There is no user-facing pause button.
- Reaching the limit ends the session automatically with `end_reason = limit` and plays the end sound. While the app is in the foreground use a timeout scheduled for `now + remaining`; on every app resume recompute instead of trusting the timeout.

## Finish check (screen 10)

Shown after every stop and after the limit.

- The target shown is the remaining target: `target_amount - done_amount`.
- Yes: `done_amount = target_amount`, plan item status `done`.
- Partly: opens a stepper for the amount done (1 to remaining target minus 1, default 1). `done_amount` increases by it. The item stays `planned` while time remains, and becomes `done` when `used_seconds >= limit_minutes * 60`.
- If the task has a cursor: set `cursor_from` and `cursor_to` on the session, and advance `tasks.cursor` by the amount done.
- Optional one-line note, maximum 140 characters, saved on the session.
- A plan item is `done` when the finish check is Yes or when the limit is used up. A done item cannot be started again that day.
- Show "Next time: from p.107" under the buttons when a cursor exists.

## Today (screen 7)

Composition top to bottom: goal card (plan 2), the list of today's plan items ordered by `position`, then the text links `Log` and `Plan tomorrow`.

- Done items: filled check and struck-through label, right side `15 / 15`.
- The first item that is neither done, skipped, nor dropped becomes the Next card: label, detail line, `12 of 30 min used` with a thin progress bar when partly used, and a Start button (Resume if `used_seconds > 0`).
- Remaining items appear as plain rows with an empty circle.
- Long-press a row for a menu with Skip today, which sets `skipped`.
- Empty state when no plan exists for today: "Nothing planned for today" with a Plan today button that opens the plan screen for today's date. (Locking still applies: the plan screen for today only allows a plan when no items exist yet, so the first plan of a new user is possible.)

## Session screen (screen 8)

Contents: task title (small), the target as a range (`Pages 105 to 106`, computed from cursor and remaining target; for non-cursor tasks show the amount and unit), the timer (`mm:ss`, tabular figures), the line `Left today, limit 30 min`, the Stop button, and a hidden slot for the status line "Do Not Disturb on, calls allowed" that plan 5 fills.

- Keep the screen awake with expo-keep-awake.
- Hide the status bar and navigation bar for the duration (immersive mode).
- Update the display every second from the clock, not from a counter.

## Recovery (`reconcileOpenSession`)

Run at every app start and every foreground return.

- Open session, running, remaining time still positive: navigate straight to the Session screen.
- Open session whose limit already passed: end it with `end_reason = limit` at the limit time (not at the current time), then show the finish check.
- Open session paused: show the Session screen in its paused state.

## Tests

- `elapsed` and `remaining` with a fixed clock, including exactly at the limit.
- Two `start` calls in a row: the second fails.
- Stop at 12 minutes, resume, and reach the limit: `used_seconds` equals 30 minutes and the item is `done`.
- Finish check Partly with a cursor: cursor advances by the amount done.
- Recovery when the app was killed for two hours during a 30-minute limit: session ends at the limit time.
- Yes before the limit marks the item done and blocks a restart.

## Acceptance

- Run a complete day from the seed data on a physical device with no network.
- Killing the app during a session and reopening returns to the correct timer value.
- A session that hits its limit while the screen is off shows the finish check on next unlock, with the correct used time.
- Today, Session, and Session done match mockup screens 7, 8, and 10.
- Start using the app on yourself here, before plan 5.