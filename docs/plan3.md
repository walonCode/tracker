# Plan 3: Tasks and planning

Depends on: plans 1 and 2.
Mockup screens: 4 (Plan tomorrow), 5 (Add saved task), 6 (New task), plus the additions from the gap review: unfinished carryover, repeat days, and task editing.
Outcome: the user builds tasks with a required amount, saves them for reuse, and plans tomorrow in one tap when the plan is prefilled from repeats.

## Task model

A task must have a title, an amount greater than zero, a unit, a default time limit, and optionally a detail note, a cursor, repeat days, a start time, and a goal tag. The unit list is fixed: pages, verses, words, sets, papers, min. Time limit options: 15, 30, 50, 90.

Cursor is allowed only for pages and verses (sequential material). It marks where the next session starts.

## Label rules (`src/domain/labels.ts`)

`taskLabel(task)` produces the sentence shown everywhere:

- With a cursor: `<title> <amount> <unit> from <prefix><cursor>`, for example `Read Quran 2 pages from p.105`. Prefix is `p.` for pages and `v.` for verses.
- Without a cursor: `<title>, <amount> <unit>`, for example `Write section 3.4, 500 words`.
- Singular units when the amount is 1 (`1 page`).

The detail note is not part of the label. It appears as a second line on the Today Next card and the Session screen (for example `squat, lunge, calf raise`).

## Screens

**New task (screen 6).** Fields in order: What (title), How much (stepper 1 to 999 plus unit chips), Starts at (shown only for pages or verses), Time limit (chips), Repeat on (seven weekday chips, Monday first, replacing the single Repeat daily toggle in the mockup), Start time (optional, plan 7 uses it), For this goal (toggle, off by default). A preview card shows the exact label. Save is blocked with an inline error if the title is shorter than 3 characters.

**Add saved task (screen 5).** A bottom sheet with a search field and the list of non-archived tasks. Tasks already in tomorrow's plan show "Added". Tapping + adds it. Typing a name with no match shows "Create <name>" which opens the New task screen with the title filled.

**Plan tomorrow (screen 4).** Sections from top:
1. Unfinished today (only when there are any). Each row shows the label with Keep and Drop buttons.
2. Tomorrow's list, reorderable by drag (react-native-draggable-flatlist).
3. Add saved task, then the total line (`3 tasks, 1 h 35 min`).
4. Save plan (filled button).

The page header shows the date and the words "filled from your repeats" only when repeats were applied.

## Plan building logic (`src/domain/planBuilder.ts`)

`buildDraft(date)`:
1. If plan items already exist for `date`, return them (the user is editing a saved plan).
2. Otherwise select every non-archived task whose `repeat_days` contains `weekdayOf(date)`, ordered by `start_time` (nulls last) then task id.
3. Collect carryover: today's items with status `planned`. If the same task is already in the repeat list, mark today's item `dropped` and do not show it under Unfinished (it repeats anyway). Otherwise show it under Unfinished.
4. Keep adds the task to the top of tomorrow's draft with a fresh full limit and the original target. Drop sets today's item to `dropped`.

Nothing is written to `plan_items` until Save plan. Saving writes rows with `position`, `limit_minutes` (task default), `target_amount` (task amount), and `label_snapshot`.

## Locking rule

`planItems.insert` and `planItems.reorder` accept only `plan_date` greater than today. Items dated today can change only through the session engine (plan 4) or through Skip today, which sets `skipped`. Add the Skip action to a row menu on Today in plan 4.

## Task management

- Edit task: opens the New task screen prefilled. Changing amount, unit, or limit affects future plans only. Changing the cursor is how the user corrects a wrong page.
- Archive task: sets `archived_at`. Archived tasks disappear from the picker and stop repeating, and their log entries remain. There is no delete.
- Entry point: a Tasks row inside Session settings is too hidden, so add a "Saved tasks" item to the Today overflow menu.

## Tests

- `taskLabel` for cursor and non-cursor tasks, singular amounts, and pages versus verses prefix.
- `buildDraft` on a Wednesday with repeats on Monday, Wednesday, Friday.
- Carryover: unfinished repeating task is deduplicated; unfinished one-off task appears under Unfinished.
- Insert of a plan item dated today or earlier is rejected.
- Editing a task's amount does not change `label_snapshot` on existing plan items.

## Acceptance

- Creating a task without an amount is impossible.
- With Gym and Quran repeating daily, opening Plan tomorrow shows both already listed, and one tap on Save plan finishes planning.
- Adding a saved one-off task takes one tap.
- A task left unfinished today appears under Unfinished today with Keep and Drop.
- Reordering persists after Save plan and a restart.