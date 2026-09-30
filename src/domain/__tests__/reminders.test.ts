import { localTimeToSeconds } from "../dates";
import { reminderSlots, type ReminderSource } from "../reminders";

const TODAY = "2026-09-30";
const NOW = localTimeToSeconds(TODAY, "12:00");

function item(id: number, fields: Partial<ReminderSource>): ReminderSource {
  return { id, plan_date: TODAY, status: "planned", label_snapshot: `Item ${id}`, start_time: "18:00", ...fields };
}

describe("reminderSlots", () => {
  it("schedules planned items with a start time over the next 7 days, soonest first", () => {
    const slots = reminderSlots(
      [
        item(1, { plan_date: "2026-10-01", start_time: "07:00" }),
        item(2, {}),
        item(3, { plan_date: "2026-10-06" }), // day 7
        item(4, { plan_date: "2026-10-07" }), // day 8: too far
      ],
      TODAY,
      NOW,
    );
    expect(slots.map((s) => s.planItemId)).toEqual([2, 1, 3]);
    expect(slots[0]).toEqual({ planItemId: 2, at: localTimeToSeconds(TODAY, "18:00"), title: "Item 2" });
  });

  it("skips skipped, dropped, and done items, items without a start time, and times already past", () => {
    const slots = reminderSlots(
      [
        item(1, { status: "skipped" }),
        item(2, { status: "dropped" }),
        item(3, { status: "done" }),
        item(4, { start_time: null }),
        item(5, { start_time: "09:00" }),
      ],
      TODAY,
      NOW,
    );
    expect(slots).toEqual([]);
  });
});
