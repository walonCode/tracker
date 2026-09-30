import { taskLabel } from "../labels";

describe("taskLabel", () => {
  it("uses the cursor with a page prefix", () => {
    expect(taskLabel({ title: "Read Quran", amount: 2, unit: "pages", cursor: 105 })).toBe(
      "Read Quran 2 pages from p.105",
    );
  });

  it("uses a verse prefix for verses", () => {
    expect(taskLabel({ title: "Memorise", amount: 5, unit: "verses", cursor: 12 })).toBe(
      "Memorise 5 verses from v.12",
    );
  });

  it("uses a comma form without a cursor", () => {
    expect(taskLabel({ title: "Write section 3.4", amount: 500, unit: "words", cursor: null })).toBe(
      "Write section 3.4, 500 words",
    );
  });

  it("uses singular units for an amount of 1", () => {
    expect(taskLabel({ title: "Read", amount: 1, unit: "pages", cursor: 7 })).toBe("Read 1 page from p.7");
    expect(taskLabel({ title: "Gym", amount: 1, unit: "sets", cursor: null })).toBe("Gym, 1 set");
    expect(taskLabel({ title: "Stretch", amount: 1, unit: "min", cursor: null })).toBe("Stretch, 1 min");
  });

  it("ignores a cursor on a non-sequential unit", () => {
    expect(taskLabel({ title: "Gym", amount: 3, unit: "sets", cursor: 4 })).toBe("Gym, 3 sets");
  });
});
