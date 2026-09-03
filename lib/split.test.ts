import { describe, it, expect } from "vitest";
import { splitEqually } from "./split";

describe("splitEqually", () => {
  const cases: { amountCents: number; people: number }[] = [
    { amountCents: 12345, people: 4 },
    { amountCents: 10001, people: 3 },
    { amountCents: 100, people: 1 },
    { amountCents: 101, people: 2 },
    { amountCents: 999, people: 7 },
    { amountCents: 999983, people: 13 }, // prime count of people
    { amountCents: 1, people: 3 },
    { amountCents: 3333, people: 3 }, // the ₹33.33 / 3 people rounding-stress shape
  ];

  it.each(cases)("sums to exactly amountCents for $amountCents / $people", ({ amountCents, people }) => {
    const userIds = Array.from({ length: people }, (_, i) => `user-${i}`);
    const splits = splitEqually(amountCents, userIds);

    expect(splits).toHaveLength(people);
    const sum = splits.reduce((acc, s) => acc + s.shareCents, 0);
    expect(sum).toBe(amountCents);
  });

  it("distributes the remainder one cent at a time to the first N members", () => {
    const splits = splitEqually(12345, ["a", "b", "c", "d"]);
    expect(splits.map((s) => s.shareCents)).toEqual([3087, 3086, 3086, 3086]);
  });

  it("never produces a negative or fractional share", () => {
    const splits = splitEqually(7, ["a", "b", "c"]);
    for (const s of splits) {
      expect(s.shareCents).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(s.shareCents)).toBe(true);
    }
  });

  it("50 expenses of 3333 cents split 3 ways never drift from the true total", () => {
    let totalShares = 0;
    for (let i = 0; i < 50; i++) {
      const splits = splitEqually(3333, ["a", "b", "c"]);
      totalShares += splits.reduce((acc, s) => acc + s.shareCents, 0);
    }
    expect(totalShares).toBe(50 * 3333);
  });
});
