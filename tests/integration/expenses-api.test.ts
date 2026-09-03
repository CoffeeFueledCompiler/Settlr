import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, testPrisma, createTestUser } from "../setup/test-db";
import { mockSignedInAs } from "../setup/mock-auth";
import { POST as createExpense, GET as listExpenses } from "@/app/api/groups/[id]/expenses/route";

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function makeGroup(status: "ACTIVE" | "SETTLED" = "ACTIVE") {
  const [a, b] = await Promise.all([createTestUser(), createTestUser()]);
  const group = await testPrisma.group.create({
    data: {
      name: "Trip",
      joinCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
      createdById: a.id,
      status,
      settledAt: status === "SETTLED" ? new Date() : null,
      members: { create: [{ userId: a.id }, { userId: b.id }] },
    },
  });
  return { group, a, b };
}

describe("expenses API (integration)", () => {
  beforeEach(resetDb);

  it("rejects an expense whose splits don't sum to the total amount", async () => {
    const { group, a, b } = await makeGroup();
    mockSignedInAs(a.id);

    const res = await createExpense(
      jsonRequest(`http://t/api/groups/${group.id}/expenses`, "POST", {
        description: "Dinner",
        amountCents: 1000,
        paidById: a.id,
        splits: [
          { userId: a.id, shareCents: 400 },
          { userId: b.id, shareCents: 400 }, // 800 != 1000
        ],
      }),
      { params: Promise.resolve({ id: group.id }) }
    );

    expect(res.status).toBe(400);
    expect(await testPrisma.expense.count()).toBe(0);
  });

  it("rejects an expense whose payer or split members aren't in the group", async () => {
    const { group, a } = await makeGroup();
    const outsider = await createTestUser();
    mockSignedInAs(a.id);

    const res = await createExpense(
      jsonRequest(`http://t/api/groups/${group.id}/expenses`, "POST", {
        description: "Dinner",
        amountCents: 1000,
        paidById: a.id,
        splits: [{ userId: outsider.id, shareCents: 1000 }],
      }),
      { params: Promise.resolve({ id: group.id }) }
    );

    expect(res.status).toBe(400);
  });

  it("accepts a valid expense and stores exact splits", async () => {
    const { group, a, b } = await makeGroup();
    mockSignedInAs(a.id);

    const res = await createExpense(
      jsonRequest(`http://t/api/groups/${group.id}/expenses`, "POST", {
        description: "Dinner",
        amountCents: 1001,
        category: "food",
        paidById: a.id,
        splits: [
          { userId: a.id, shareCents: 501 },
          { userId: b.id, shareCents: 500 },
        ],
      }),
      { params: Promise.resolve({ id: group.id }) }
    );

    expect(res.status).toBe(201);
    const stored = await testPrisma.expense.findFirst({ include: { splits: true } });
    expect(stored?.amountCents).toBe(1001);
    expect(stored?.splits.reduce((acc, s) => acc + s.shareCents, 0)).toBe(1001);
  });

  it("rejects a new expense on a settled trip", async () => {
    const { group, a, b } = await makeGroup("SETTLED");
    mockSignedInAs(a.id);

    const res = await createExpense(
      jsonRequest(`http://t/api/groups/${group.id}/expenses`, "POST", {
        description: "Too late",
        amountCents: 500,
        paidById: a.id,
        splits: [
          { userId: a.id, shareCents: 250 },
          { userId: b.id, shareCents: 250 },
        ],
      }),
      { params: Promise.resolve({ id: group.id }) }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/settled/i);
  });

  it("a non-member posting an expense gets 404", async () => {
    const { group } = await makeGroup();
    const outsider = await createTestUser();
    mockSignedInAs(outsider.id);

    const res = await createExpense(
      jsonRequest(`http://t/api/groups/${group.id}/expenses`, "POST", {
        description: "x",
        amountCents: 100,
        paidById: outsider.id,
        splits: [{ userId: outsider.id, shareCents: 100 }],
      }),
      { params: Promise.resolve({ id: group.id }) }
    );

    expect(res.status).toBe(404);
  });

  it("GET filters by category", async () => {
    const { group, a } = await makeGroup();
    await testPrisma.expense.createMany({
      data: [
        { groupId: group.id, paidById: a.id, amountCents: 100, description: "Food", category: "food" },
        { groupId: group.id, paidById: a.id, amountCents: 200, description: "Cab", category: "transport" },
      ],
    });

    mockSignedInAs(a.id);
    const res = await listExpenses(new Request(`http://t/api/groups/${group.id}/expenses?category=food`), {
      params: Promise.resolve({ id: group.id }),
    });
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.expenses[0].category).toBe("food");
  });
});
