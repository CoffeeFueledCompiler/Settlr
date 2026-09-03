import { describe, it, expect } from "vitest";
import { computeSettlements } from "./settlement";

function sumPositive(net: Map<string, number>) {
  return Array.from(net.values())
    .filter((v) => v > 0)
    .reduce((a, b) => a + b, 0);
}

describe("computeSettlements", () => {
  it("produces no settlement row for a member with a zero balance", () => {
    const net = new Map([
      ["a", 0],
      ["b", 100],
      ["c", -100],
    ]);
    const settlements = computeSettlements(net);
    expect(settlements.every((s) => s.fromUserId !== "a" && s.toUserId !== "a")).toBe(true);
    expect(settlements).toEqual([{ fromUserId: "c", toUserId: "b", amountCents: 100 }]);
  });

  it("returns no settlements when every balance is already zero", () => {
    const net = new Map([
      ["a", 0],
      ["b", 0],
    ]);
    expect(computeSettlements(net)).toEqual([]);
  });

  it("a single payer produces at most n-1 payments", () => {
    // One person paid for everyone; three others owe only them.
    const net = new Map([
      ["payer", 300],
      ["b", -100],
      ["c", -100],
      ["d", -100],
    ]);
    const settlements = computeSettlements(net);
    expect(settlements.length).toBeLessThanOrEqual(3); // n - 1 for n = 4
    expect(settlements.every((s) => s.toUserId === "payer")).toBe(true);
    expect(settlements.reduce((acc, s) => acc + s.amountCents, 0)).toBe(300);
  });

  it("satisfies the balance-sum invariant on real seeded-trip-shaped data", () => {
    const net = new Map([
      ["a", 24737],
      ["b", 14780],
      ["c", -15129],
      ["d", -24388],
    ]);
    const settlements = computeSettlements(net);
    expect(settlements.reduce((acc, s) => acc + s.amountCents, 0)).toBe(sumPositive(net));
  });

  it("fuzz: sum(settlements) === sum(positive balances) for many random balance sets", () => {
    for (let trial = 0; trial < 200; trial++) {
      const n = 2 + Math.floor(Math.random() * 14); // 2-15 members
      const net = new Map<string, number>();

      // Build a set of per-user deltas that sums to exactly zero (as a real
      // trip's balances always do), so the invariant is meaningful to check.
      const deltas: number[] = [];
      let runningTotal = 0;
      for (let i = 0; i < n - 1; i++) {
        const delta = Math.floor(Math.random() * 40000) - 20000;
        deltas.push(delta);
        runningTotal += delta;
      }
      deltas.push(-runningTotal); // last member absorbs the remainder so the set sums to zero

      deltas.forEach((d, i) => net.set(`user-${i}`, d));

      const settlements = computeSettlements(net); // throws internally if the invariant is violated
      const totalSettled = settlements.reduce((acc, s) => acc + s.amountCents, 0);
      expect(totalSettled).toBe(sumPositive(net));

      // No settlement should ever move money to/from a member who nets to zero.
      for (const [userId, amount] of net) {
        if (amount === 0) {
          expect(settlements.some((s) => s.fromUserId === userId || s.toUserId === userId)).toBe(
            false
          );
        }
      }
    }
  });
});
