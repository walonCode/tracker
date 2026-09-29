# Plan 6: Log and statistics

Depends on: plans 1 to 4 (plan 5 is not required).
Mockup screens: 11 (Log, all tasks), 12 (Log, one task), 13 (Log, day selected).
Outcome: a Log screen with a 12-week heatmap, a per-task view with a run counter, a day detail view, and an entry list. Opened on purpose from Today, never shown on the home or session screens.

## Data queries (`src/db/repos/log.ts`)

- `dailyMinutes(from, to, taskId?)`: `SELECT plan_date, SUM(used_seconds) FROM plan_items WHERE plan_date BETWEEN ? AND ? [AND task_id = ?] GROUP BY plan_date`.
- `dailyHits(from, to, taskId)`: plan items for one task with `status = 'done'` per date.
- `dayDetail(date)`: plan items for the date with their sessions (notes, `cursor_from`, `cursor_to`, `amount_done`).
- `entries(limit, offset, taskId?)`: sessions with a note or an amount, newest first.
- `scheduledDates(taskId, from, to)`: dates on which the task had a plan item, used for the run counter.

## Shading rule

Fixed thresholds, so a shade means the same thing all year:

- Level 0: no focus (blank square).
- Level 1: up to 30 min.
- Level 2: 31 to 60 min.
- Level 3: 61 to 120 min.
- Level 4: more than 120 min.

Per-task view is binary: filled when the plan item is `done`, blank otherwise.

## Grid

- 12 columns (weeks) by 7 rows (Monday at the top). The last column is the current week; days after today are dashed outlines, not blank squares, so they are never read as missed days.
- Build from plain `View` cells, no chart library. Each cell has an accessibility label such as `Mon 28 Sep, 130 minutes`.
- Tap a cell to select it (outlined) and show that day's detail below. Tap it again to clear.
- Legend row under the grid: Less to More for the overall view; Limit missed and Limit hit for the per-task view.

## Run counter (`src/domain/runCounter.ts`)

Counts consecutive scheduled days on which the task was done, ending at today or yesterday.

```
run = 0
for date from today going backward:
  if task was not scheduled on date: continue         # rest days never break a run
  if task was done on date: run += 1
  else if date is today: continue                     # today is not over yet
  else: break
return run
```

A task is scheduled on a date if it has a plan item that day or its `repeat_days` includes the weekday and the date is on or after the task's `created_at`. Show one number under the grid: `9 days` with the caption "Current run of limit hit".

## Screen structure

- Top bar: back arrow and "Log".
- Filter chips: All plus every non-archived task that has at least one plan item. One selected at a time. Scrolls horizontally.
- Heatmap and legend.
- One summary line. Overall view: `This week: 6 h 40 min` (Monday through today). Day selected: `Mon 28 Sep, 2 h 10 min`. Per-task view: the run counter instead.
- Entry list below: date and label on the first line (using `label_snapshot`, or `pages 105 to 106` from the cursor range when present), the note on the second line. Load 30 at a time as the user scrolls.
- Day detail replaces the entry list when a cell is selected: each plan item as `label, 15 of 15 min` or `Read papers, 1 of 2`, with its note.
- Early exits (`end_reason = early_exit`) show a small "Ended early" tag on the entry.

No other numbers, percentages, trend lines, or charts.

## Empty states

- Fewer than 7 days of data: show the grid anyway with everything blank and the text "Your log fills in as you finish sessions."
- Per-task view for a task with no history: same text, no run counter.

## Tests

- Shading thresholds at 0, 30, 31, 60, 61, 120, 121 minutes.
- Run counter fixtures: all done; a rest day inside the run; a missed scheduled day; today not yet done; a task created three days ago.
- Query correctness against the dev seed: totals for a chosen week match a hand computation.
- Grid builder: the current week has dashed cells only after today; Monday-first ordering.

## Acceptance

- Log opens in under a second with 84 days of seeded data.
- Selecting a day shows exactly the plan items and notes for that date.
- The per-task run does not reset over a scheduled rest day.
- TalkBack reads each cell with its date and minutes.