import { applyFinish, canAnswerPartly, nextItem, remainingTarget, targetText } from "../session";
import { elapsed, limitReachedAt, remaining, usedToday } from "../sessionMath";

const T0 = 1_800_000_000;
const item = { limit_minutes: 30, used_seconds: 0 };
const running = { state: "running" as const, active_seconds: 0, resumed_at: T0 };

describe("sessionMath", () => {
  it("elapsed adds the running stretch and freezes when paused or ended", () => {
    expect(elapsed(running, T0 + 125)).toBe(125);
    expect(elapsed({ ...running, active_seconds: 60 }, T0 + 10)).toBe(70);
    expect(elapsed({ state: "paused", active_seconds: 300, resumed_at: null }, T0 + 999)).toBe(300);
    expect(elapsed({ state: "ended", active_seconds: 300, resumed_at: null }, T0 + 999)).toBe(300);
  });

  it("elapsed subtracts paused call time", () => {
    expect(elapsed(running, T0 + 600, 120_000)).toBe(480);
    expect(elapsed(running, T0 + 60, 120_000)).toBe(0);
  });

  it("remaining counts down to zero exactly at the limit and never below", () => {
    const partUsed = { limit_minutes: 30, used_seconds: 12 * 60 };
    expect(usedToday(partUsed, running, T0 + 60)).toBe(13 * 60);
    expect(remaining(partUsed, running, T0 + 60)).toBe(17 * 60);
    expect(remaining(partUsed, running, T0 + 18 * 60)).toBe(0);
    expect(remaining(partUsed, running, T0 + 3600)).toBe(0);
    expect(remaining(item, null, T0)).toBe(1800);
  });

  it("limitReachedAt accounts for used time and pauses", () => {
    expect(limitReachedAt({ limit_minutes: 30, used_seconds: 600 }, running)).toBe(T0 + 1200);
    expect(limitReachedAt(item, running, 60_000)).toBe(T0 + 1860);
    expect(limitReachedAt(item, { state: "paused", active_seconds: 0, resumed_at: null })).toBeNull();
  });
});

describe("finish rules", () => {
  const base = { target_amount: 5, done_amount: 1, used_seconds: 600, limit_minutes: 30 };

  it("Yes completes the remaining target and advances the cursor", () => {
    expect(applyFinish(base, 105, { kind: "yes" })).toEqual({
      amountDone: 4,
      doneAmount: 5,
      status: "done",
      cursorFrom: 105,
      cursorTo: 108,
      nextCursor: 109,
    });
  });

  it("Partly adds the amount and stays planned while time remains", () => {
    const result = applyFinish(base, 105, { kind: "partly", amount: 2 });
    expect(result).toMatchObject({ amountDone: 2, doneAmount: 3, status: "planned", cursorTo: 106, nextCursor: 107 });
    expect(applyFinish({ ...base, used_seconds: 1800 }, null, { kind: "partly", amount: 1 }).status).toBe("done");
  });

  it("Partly rejects amounts outside 1 to remaining target - 1", () => {
    expect(() => applyFinish(base, null, { kind: "partly", amount: 4 })).toThrow();
    expect(() => applyFinish(base, null, { kind: "partly", amount: 0 })).toThrow();
    expect(canAnswerPartly({ target_amount: 2, done_amount: 1 })).toBe(false);
    expect(remainingTarget(base)).toBe(4);
  });

  it("targetText shows a range for sequential units", () => {
    expect(targetText("pages", 105, 2)).toBe("Pages 105 to 106");
    expect(targetText("verses", 7, 1)).toBe("Verse 7");
    expect(targetText("words", null, 500)).toBe("500 words");
  });

  it("nextItem skips done, skipped, and dropped items", () => {
    const items = [{ status: "done" }, { status: "skipped" }, { status: "dropped" }, { status: "planned" }] as const;
    expect(nextItem(items)).toBe(items[3]);
    expect(nextItem([{ status: "done" }])).toBeNull();
  });
});
