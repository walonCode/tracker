import type { Db, TaskUnit } from "@/db/types";
import * as settings from "@/db/repos/settings";
import { nowSeconds } from "@/domain/clock";
import { addDays, localTimeToSeconds, today, weekdayOf } from "@/domain/dates";

// Development data: one goal, four tasks, and 84 days of plan items with
// sessions, ending with today's plan still open. Runs once per install.

const SEEDED_KEY = "dev_seeded";
export const SEED_DAYS = 84;

interface SeedTask {
  title: string;
  detail: string | null;
  amount: number;
  unit: TaskUnit;
  cursorStart: number | null;
  minutes: 15 | 30 | 50 | 90;
  startTime: string;
  weekdays: number[];
}

const TASKS: SeedTask[] = [
  { title: "Read Quran", detail: null, amount: 2, unit: "pages", cursorStart: 1, minutes: 15, startTime: "05:30", weekdays: [0, 1, 2, 3, 4, 5, 6] },
  { title: "Gym", detail: "squat, lunge, calf raise", amount: 3, unit: "sets", cursorStart: null, minutes: 50, startTime: "07:00", weekdays: [0, 2, 4] },
  { title: "Write thesis", detail: null, amount: 500, unit: "words", cursorStart: null, minutes: 90, startTime: "09:00", weekdays: [0, 1, 2, 3, 4] },
  { title: "Read papers", detail: null, amount: 2, unit: "papers", cursorStart: null, minutes: 30, startTime: "14:00", weekdays: [1, 3] },
];

// Deterministic generator so every dev install gets the same history.
function lcg(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
}

function label(task: SeedTask, cursor: number | null): string {
  const unit = task.amount === 1 ? task.unit.replace(/s$/, "") : task.unit;
  if (cursor !== null) {
    const prefix = task.unit === "verses" ? "v." : "p.";
    return `${task.title} ${task.amount} ${unit} from ${prefix}${cursor}`;
  }
  return `${task.title}, ${task.amount} ${unit}`;
}

export async function seedDevData(db: Db): Promise<void> {
  if ((await settings.get(db, SEEDED_KEY)) !== null) return;

  const now = nowSeconds();
  const todayDate = today();
  const firstDate = addDays(todayDate, -(SEED_DAYS - 1));
  const createdAt = localTimeToSeconds(firstDate, "00:00");
  const random = lcg(42);

  await db.withTransactionAsync(async () => {
    const goal = await db.runAsync(
      "INSERT INTO goals (title, due_date, status, created_at) VALUES (?, ?, 'active', ?)",
      ["Finish the thesis draft", addDays(todayDate, 60), createdAt],
    );

    const taskIds: number[] = [];
    const cursors: (number | null)[] = [];
    for (const task of TASKS) {
      const row = await db.runAsync(
        `INSERT INTO tasks (title, detail, amount, unit, cursor, default_minutes, goal_id, start_time, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [task.title, task.detail, task.amount, task.unit, task.cursorStart, task.minutes,
          task.unit === "words" ? goal.lastInsertRowId : null, task.startTime, createdAt],
      );
      taskIds.push(row.lastInsertRowId);
      cursors.push(task.cursorStart);
      for (const weekday of task.weekdays) {
        await db.runAsync("INSERT INTO repeat_days (task_id, weekday) VALUES (?, ?)", [row.lastInsertRowId, weekday]);
      }
    }

    for (let offset = 0; offset < SEED_DAYS; offset++) {
      const date = addDays(firstDate, offset);
      const isToday = date === todayDate;
      let position = 0;

      for (let t = 0; t < TASKS.length; t++) {
        const task = TASKS[t];
        if (!task.weekdays.includes(weekdayOf(date))) continue;

        const limitSeconds = task.minutes * 60;
        const item = await db.runAsync(
          `INSERT INTO plan_items (task_id, plan_date, position, label_snapshot, limit_minutes, target_amount)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [taskIds[t], date, position++, label(task, cursors[t]), task.minutes, task.amount],
        );
        if (isToday) continue;

        const roll = random();
        if (roll < 0.08) {
          await db.runAsync("UPDATE plan_items SET status = 'skipped' WHERE id = ?", [item.lastInsertRowId]);
          continue;
        }

        const full = roll < 0.75;
        const usedSeconds = full
          ? Math.round(limitSeconds * (0.6 + 0.4 * random()))
          : Math.round(limitSeconds * (0.2 + 0.4 * random()));
        const amountDone = full ? task.amount : Math.max(1, Math.floor(task.amount / 2));
        const startedAt = localTimeToSeconds(date, task.startTime);
        const endedAt = startedAt + usedSeconds;
        const cursorFrom = cursors[t];
        const cursorTo = cursorFrom === null ? null : cursorFrom + amountDone - 1;

        await db.runAsync(
          `INSERT INTO sessions (plan_item_id, state, started_at, resumed_at, ended_at, active_seconds,
             end_reason, finished, amount_done, cursor_from, cursor_to, note)
           VALUES (?, 'ended', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [item.lastInsertRowId, startedAt, startedAt, endedAt, usedSeconds,
            full ? "finished" : "stopped", full ? "yes" : "partly", amountDone,
            cursorFrom, cursorTo, random() < 0.2 ? "Steady focus today" : null],
        );
        await db.runAsync(
          `UPDATE plan_items SET used_seconds = ?, done_amount = ?, status = ?, completed_at = ? WHERE id = ?`,
          [usedSeconds, amountDone, full ? "done" : "planned", full ? endedAt : null, item.lastInsertRowId],
        );
        if (cursorFrom !== null) cursors[t] = cursorFrom + amountDone;
      }
    }

    for (let t = 0; t < TASKS.length; t++) {
      if (cursors[t] !== null) {
        await db.runAsync("UPDATE tasks SET cursor = ? WHERE id = ?", [cursors[t], taskIds[t]]);
      }
    }

    await settings.set(db, SEEDED_KEY, String(now));
  });
}
