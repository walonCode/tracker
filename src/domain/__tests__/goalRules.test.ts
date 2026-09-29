import { daysLeft, validateDueDate, validateReason, validateTitle } from "../goalRules";

describe("validateTitle", () => {
  it("trims and requires 3 to 140 characters", () => {
    expect(validateTitle("  ab  ")).not.toBeNull();
    expect(validateTitle(" abc ")).toBeNull();
    expect(validateTitle("x".repeat(140))).toBeNull();
    expect(validateTitle("x".repeat(141))).not.toBeNull();
  });
});

describe("validateReason", () => {
  it("rejects blank and 2 characters, accepts 3", () => {
    expect(validateReason("")).not.toBeNull();
    expect(validateReason("   ")).not.toBeNull();
    expect(validateReason("no")).not.toBeNull();
    expect(validateReason("new")).toBeNull();
  });
});

describe("validateDueDate", () => {
  it("rejects yesterday and a missing date, accepts today and later", () => {
    expect(validateDueDate("2026-09-27", "2026-09-28")).not.toBeNull();
    expect(validateDueDate(null, "2026-09-28")).not.toBeNull();
    expect(validateDueDate("2026-09-28", "2026-09-28")).toBeNull();
    expect(validateDueDate("2027-01-01", "2026-09-28")).toBeNull();
  });
});

describe("daysLeft", () => {
  it("is 0 on the due date and never negative", () => {
    expect(daysLeft("2026-09-28", "2026-09-28")).toBe(0);
    expect(daysLeft("2026-10-05", "2026-09-28")).toBe(7);
    expect(daysLeft("2026-09-20", "2026-09-28")).toBe(0);
  });
});
