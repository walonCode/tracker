# Plan 2: Goal and first run

Depends on: plan 1.
Mockup screens: 1 (Set goal), 14 (Goal), plus empty shells for 2 (Permissions) and 3 (Allowed apps).
Outcome: the user sets one goal on first launch, reaches Today, and can complete or drop the goal from the Goal screen.

## Rules

- At most one active goal. Enforce it in three places: the `one_active_goal` index, `goals.create` (throws `ActiveGoalExists`), and the UI (the create screen is unreachable while a goal is active).
- Title: trimmed, 3 to 140 characters.
- Due date: required, today or later, picked with a Material date picker (react-native-paper-dates).
- Dropping a goal requires a reason of 3 to 140 characters. Completing asks for a plain confirmation only.
- Closed goals stay in the table with their status. There is no history screen in v1.

## Data functions (`src/db/repos/goals.ts`)

- `getActive()`
- `create({ title, dueDate })`
- `complete(id)`
- `drop(id, reason)`
- `listClosed()`

Validation lives in `src/domain/goalRules.ts` as pure functions (`validateTitle`, `validateDueDate`, `validateReason`, `daysLeft`) so the screens and the repo share it.

## Onboarding state

Settings key `onboarding_step` holds `goal`, `permissions`, `apps`, or `done`. The root layout reads it and redirects to `/onboarding/<step>`. Each step advances only when its screen finishes.

- `/onboarding/goal` is screen 1. Fields: Goal, Due. Button: Continue. The hint text says a new goal can be set only after this one is finished or dropped.
- `/onboarding/permissions` and `/onboarding/apps` are stubs with a Continue button. Plan 5 fills them.
- Permissions are optional. If the user skips them, sessions run as a timer only and the blocking features stay off. Nothing on Today nags about it.

## Today shell

- With an active goal: a bordered card at the top with the label "Goal, due <date>" and the title. Tapping it opens `/goal`.
- With no active goal (after completing or dropping): a single centered button, "Set your next goal", which opens `/onboarding/goal?mode=next` and skips the permissions and apps steps.
- Below the goal card: a placeholder for the task list (plan 4 fills it).

## Overflow menu

Add an overflow (three dots) action to `ScreenBar` on Today. It is not in the mockups and is added on purpose, because later plans need a home for Session settings (plan 5) and Export data (plan 7). In this plan the menu is empty and hidden.

## Goal screen (screen 14)

- Shows the title, the due date, and days left (`daysLeft`).
- Mark complete (filled button): a Material dialog asks "Mark this goal complete?" with Cancel and Complete.
- Drop goal (outlined button): a dialog with a text field labeled "Why are you dropping it?". On submit, an invalid reason shows an inline error under the field. Do not use a disabled button.
- After either action, navigate to Today, which shows the "Set your next goal" state.

## Tests

- Creating a second active goal throws `ActiveGoalExists`.
- Completing a goal, then creating another, succeeds.
- Dropping without a reason (or with 2 characters) fails; with a valid reason it succeeds and stores the reason.
- `validateDueDate` rejects yesterday and accepts today.
- `daysLeft` returns 0 on the due date and never a negative number.

## Acceptance

- A fresh install routes goal, permissions stub, apps stub, Today.
- Killing the app on the permissions stub and reopening returns to the permissions stub.
- The goal card opens the Goal screen; completing it shows the "Set your next goal" state.
- Dropping with a blank reason shows an error and changes nothing.