import { buildGrid, gridRange, shadeLevel } from "../heatmap";
import { dayItemText, entryLabel } from "../logText";
import { runCounter, type RunInput } from "../runCounter";

describe("shadeLevel", () => {
  it.each([
    [0, 0],
    [30, 1],
    [31, 2],
    [60, 2],
    [61, 3],
    [120, 3],
    [121, 4],
  ])("%i minutes is level %i", (minutes, level) => {
    expect(shadeLevel(minutes)).toBe(level);
  });
});

describe("buildGrid", () => {
  // Wednesday 2026-09-30.
  const grid = buildGrid("2026-09-30");

  it("has 12 Monday-first weeks ending with the current week", () => {
    expect(grid).toHaveLength(12);
    expect(grid.every((week) => week.length === 7)).toBe(true);
    expect(grid[11][0].date).toBe("2026-09-28");
    expect(grid[11][6].date).toBe("2026-10-04");
    expect(gridRange(grid)).toEqual({ from: "2026-07-13", to: "2026-10-04" });
  });

  it("marks only the days after today in the current week as future", () => {
    expect(grid[11].map((c) => c.future)).toEqual([false, false, false, true, true, true, true]);
    expect(grid.slice(0, 11).flat().some((c) => c.future)).toBe(false);
  });
});

describe("runCounter", () => {
  // Today is Wednesday 2026-09-30.
  const base: RunInput = {
    today: "2026-09-30",
    createdOn: "2026-09-01",
    repeatDays: [0, 1, 2, 3, 4, 5, 6],
    plannedDates: new Set(),
    doneDates: new Set(),
  };
  const days = (...dates: string[]) => new Set(dates);

  it("counts every day when all are done", () => {
    const done = days("2026-09-26", "2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30");
    expect(runCounter({ ...base, createdOn: "2026-09-26", doneDates: done })).toBe(5);
  });

  it("does not break over a rest day", () => {
    // Monday, Wednesday, Friday; Tuesday is a rest day.
    const done = days("2026-09-25", "2026-09-28", "2026-09-30");
    expect(runCounter({ ...base, repeatDays: [0, 2, 4], createdOn: "2026-09-25", doneDates: done })).toBe(3);
  });

  it("stops at a missed scheduled day", () => {
    const done = days("2026-09-27", "2026-09-29", "2026-09-30");
    expect(runCounter({ ...base, doneDates: done })).toBe(2);
  });

  it("does not count today against the run before it is over", () => {
    const done = days("2026-09-28", "2026-09-29");
    expect(runCounter({ ...base, createdOn: "2026-09-28", doneDates: done })).toBe(2);
  });

  it("starts at the task's creation for a task created three days ago", () => {
    const done = days("2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30");
    expect(runCounter({ ...base, createdOn: "2026-09-28", doneDates: done })).toBe(3);
  });

  it("counts a one-off plan item as scheduled", () => {
    const planned = days("2026-09-29", "2026-09-30");
    expect(
      runCounter({ ...base, repeatDays: [], plannedDates: planned, doneDates: days("2026-09-29") }),
    ).toBe(1);
  });
});

describe("log wording", () => {
  it("uses the cursor range when present", () => {
    const entry = { label_snapshot: "Read Quran 2 pages from p.105", unit: "pages" as const, cursor_from: 105, cursor_to: 106 };
    expect(entryLabel(entry)).toBe("pages 105 to 106");
    expect(entryLabel({ ...entry, cursor_to: 105 })).toBe("page 105");
    expect(entryLabel({ ...entry, cursor_from: null, cursor_to: null })).toBe("Read Quran 2 pages from p.105");
  });

  it("shows minutes for a met target and the amount otherwise", () => {
    const item = { title: "Read papers", label_snapshot: "Read papers, 2 papers", used_seconds: 900, limit_minutes: 30, done_amount: 1, target_amount: 2 };
    expect(dayItemText(item)).toBe("Read papers, 1 of 2");
    expect(dayItemText({ ...item, done_amount: 2 })).toBe("Read papers, 2 papers, 15 of 30 min");
  });
});
