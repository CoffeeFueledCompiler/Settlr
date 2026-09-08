import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, testPrisma, createTestUser } from "../setup/test-db";
import { computePairwiseLedger, computeAllPairwiseLedgers } from "@/lib/settlement";

describe("computePairwiseLedger (integration)", () => {
  beforeEach(resetDb);

  it("nets only the two people's direct transactions, ignoring a third party", async () => {
    const [a, b, c] = await Promise.all([createTestUser(), createTestUser(), createTestUser()]);
    const group = await testPrisma.group.create({
      data: {
        name: "Trip",
        joinCode: "PAIRWS1",
        createdById: a.id,
        members: { create: [{ userId: a.id }, { userId: b.id }, { userId: c.id }] },
      },
    });

    // a pays for a dinner split with b: b owes a 250
    await testPrisma.expense.create({
      data: {
        groupId: group.id,
        paidById: a.id,
        amountCents: 500,
        description: "beach dinner",
        splits: {
          create: [
            { userId: a.id, shareCents: 250 },
            { userId: b.id, shareCents: 250 },
          ],
        },
      },
    });
    // b pays for a tuk-tuk split with a: a owes b 200
    await testPrisma.expense.create({
      data: {
        groupId: group.id,
        paidById: b.id,
        amountCents: 400,
        description: "tuk-tuk fare",
        splits: {
          create: [
            { userId: a.id, shareCents: 200 },
            { userId: b.id, shareCents: 200 },
          ],
        },
      },
    });
    // c pays for something split only with a — must not leak into the a/b pair
    await testPrisma.expense.create({
      data: {
        groupId: group.id,
        paidById: c.id,
        amountCents: 100,
        description: "snacks",
        splits: {
          create: [
            { userId: a.id, shareCents: 50 },
            { userId: c.id, shareCents: 50 },
          ],
        },
      },
    });

    const ledger = await computePairwiseLedger(testPrisma, group.id, a.id, b.id);
    expect(ledger.aOwesB).toBe(200);
    expect(ledger.bOwesA).toBe(250);
    expect(ledger.netCents).toBe(-50); // netCents < 0 => b owes a
    expect(ledger.lineItems).toHaveLength(2);
  });

  it("computeAllPairwiseLedgers returns one entry per other member", async () => {
    const [a, b, c] = await Promise.all([createTestUser(), createTestUser(), createTestUser()]);
    const group = await testPrisma.group.create({
      data: {
        name: "Trip",
        joinCode: "PAIRWS2",
        createdById: a.id,
        members: { create: [{ userId: a.id }, { userId: b.id }, { userId: c.id }] },
      },
    });

    const ledgers = await computeAllPairwiseLedgers(testPrisma, group.id, a.id);
    expect(ledgers.map((l) => l.userId).sort()).toEqual([b.id, c.id].sort());
    expect(ledgers.every((l) => l.netCents === 0)).toBe(true);
  });
});
