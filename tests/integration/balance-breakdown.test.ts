import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, testPrisma, createTestUser } from "../setup/test-db";
import { computeBalanceBreakdown } from "@/lib/settlement";

describe("computeBalanceBreakdown (integration)", () => {
  beforeEach(resetDb);

  it("returns paid/owed/net per member, including a member who paid nothing", async () => {
    const [a, b] = await Promise.all([createTestUser(), createTestUser()]);
    const group = await testPrisma.group.create({
      data: {
        name: "Trip",
        joinCode: "BALBRK1",
        createdById: a.id,
        members: { create: [{ userId: a.id }, { userId: b.id }] },
      },
    });
    await testPrisma.expense.create({
      data: {
        groupId: group.id,
        paidById: a.id,
        amountCents: 300,
        description: "Dinner",
        splits: {
          create: [
            { userId: a.id, shareCents: 150 },
            { userId: b.id, shareCents: 150 },
          ],
        },
      },
    });

    const breakdown = await computeBalanceBreakdown(testPrisma, group.id);
    const byUser = new Map(breakdown.map((r) => [r.userId, r]));

    expect(byUser.get(a.id)).toMatchObject({ paidCents: 300, owedCents: 150, netCents: 150 });
    expect(byUser.get(b.id)).toMatchObject({ paidCents: 0, owedCents: 150, netCents: -150 });
  });
});
