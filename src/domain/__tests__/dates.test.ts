import { resetClockSource, setClockSource } from "../clock";
import {
  addDays,
  daysBetween,
  formatClock,
  formatDate,
  formatDayMonth,
  formatLongDate,
  formatDuration,
  formatMinutes,
  localDate,
  localTimeToSeconds,
  mondayOf,
  today,
  weekdayOf,
} from "../dates";

// jest.global-setup.js pins TZ to America/New_York (UTC-5, UTC-4 in summer).

const utc = (iso: string) => Date.parse(iso) / 1000;

afterEach(resetClockSource);

describe("localDate", () => {
  it("uses the local day, not the UTC day", () => {
    // 03:00 UTC on 15 Jan is 22:00 on 14 Jan in New York.
    expect(localDate(utc("2026-01-15T03:00:00Z"))).toBe("2026-01-14");
    expect(localDate(utc("2026-01-15T05:00:00Z"))).toBe("2026-01-15");
  });

  it("switches exactly at local midnight", () => {
    const midnight = localTimeToSeconds("2026-03-10", "00:00");
    expect(localDate(midnight - 1)).toBe("2026-03-09");
    expect(localDate(midnight)).toBe("2026-03-10");
  });

  it("follows the DST offset change", () => {
    // Summer offset is UTC-4: 03:30 UTC is 23:30 the previous day.
    expect(localDate(utc("2026-07-01T03:30:00Z"))).toBe("2026-06-30");
    expect(localDate(utc("2026-07-01T04:30:00Z"))).toBe("2026-07-01");
  });
});

describe("today", () => {
  it("reads the replaceable clock", () => {
    setClockSource(() => Date.parse("2026-09-28T12:00:00Z"));
    expect(today()).toBe("2026-09-28");
  });
});

describe("addDays", () => {
  it("crosses month ends", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("crosses year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
    expect(addDays("2026-12-25", 10)).toBe("2027-01-04");
  });

  it("is unaffected by DST transitions", () => {
    expect(addDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDays("2026-11-01", 1)).toBe("2026-11-02");
  });
});

describe("weekdayOf and mondayOf", () => {
  const week = [
    "2026-09-28",
    "2026-09-29",
    "2026-09-30",
    "2026-10-01",
    "2026-10-02",
    "2026-10-03",
    "2026-10-04",
  ];

  it("numbers Monday as 0 through Sunday as 6", () => {
    expect(week.map(weekdayOf)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("maps every day of the week to its Monday", () => {
    for (const date of week) expect(mondayOf(date)).toBe("2026-09-28");
    expect(mondayOf("2026-10-05")).toBe("2026-10-05");
  });
});

describe("daysBetween", () => {
  it("counts whole days in both directions", () => {
    expect(daysBetween("2026-09-28", "2026-09-28")).toBe(0);
    expect(daysBetween("2026-12-30", "2027-01-02")).toBe(3);
    expect(daysBetween("2027-01-02", "2026-12-30")).toBe(-3);
    expect(daysBetween("2026-03-07", "2026-03-09")).toBe(2);
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "00:00"],
    [59, "00:59"],
    [60, "01:00"],
    [2292, "38:12"],
    [3599, "59:59"],
    [3600, "1 h"],
    [5700, "1 h 35 min"],
  ])("formats %i seconds as %s", (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});

describe("formatDate", () => {
  it("omits the year only when it matches the reference", () => {
    expect(formatDate("2026-09-28", "2026-01-01")).toBe("Mon 28 Sep");
    expect(formatDate("2027-01-04", "2026-12-30")).toBe("Mon 4 Jan 2027");
    expect(formatDate("2026-10-04")).toBe("Sun 4 Oct 2026");
  });
});

describe("formatClock and formatMinutes", () => {
  it("keeps minutes past an hour on the countdown", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(59)).toBe("00:59");
    expect(formatClock(5400)).toBe("90:00");
  });

  it("formats planned totals", () => {
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(60)).toBe("1 h");
    expect(formatMinutes(95)).toBe("1 h 35 min");
  });
});

describe("formatLongDate and formatDayMonth", () => {
  it("writes the weekday in full and the year only when it differs", () => {
    expect(formatLongDate("2026-09-30")).toBe("Wednesday 30 Sep");
    expect(formatDayMonth("2026-10-12", "2026-09-30")).toBe("12 Oct");
    expect(formatDayMonth("2027-01-05", "2026-09-30")).toBe("5 Jan 2027");
  });
});
