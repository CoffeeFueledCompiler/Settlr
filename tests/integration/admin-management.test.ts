import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, testPrisma, createTestUser } from "../setup/test-db";
import { mockSignedInAs } from "../setup/mock-auth";
import { DELETE as removeMember } from "@/app/api/groups/[id]/members/[userId]/route";
import { DELETE as removeExpense } from "@/app/api/groups/[id]/expenses/[expenseId]/route";

async function makeGroup(status: "ACTIVE" | "SETTLED" = "ACTIVE") {
  const [admin, member] = await Promise.all([createTestUser(), createTestUser()]);
  const group = await testPrisma.group.create({
    data: {
      name: "Trip",
      joinCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
      createdById: admin.id,
      status,
      settledAt: status === "SETTLED" ? new Date() : null,
      members: { create: [{ userId: admin.id }, { userId: member.id }] },
    },
  });
  return { group, admin, member };
}

describe("member removal (integration)", () => {
  beforeEach(resetDb);

  it("the trip creator can remove a member", async () => {
    const { group, admin, member } = await makeGroup();
    mockSignedInAs(admin.id);

    const res = await removeMember(new Request("http://t"), {
      params: Promise.resolve({ id: group.id, userId: member.id }),
    });
    expect(res.status).toBe(200);

    const membership = await testPrisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: member.id } },
    });
    expect(membership).toBeNull();
  });

  it("a non-admin member cannot remove another member", async () => {
    const { group, admin, member } = await makeGroup();
    mockSignedInAs(member.id);

    const res = await removeMember(new Request("http://t"), {
      params: Promise.resolve({ id: group.id, userId: admin.id }),
    });
    expect(res.status).toBe(403);

    const membership = await testPrisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: admin.id } },
    });
    expect(membership).not.toBeNull();
  });

  it("the admin cannot remove themselves", async () => {
    const { group, admin } = await makeGroup();
    mockSignedInAs(admin.id);

    const res = await removeMember(new Request("http://t"), {
      params: Promise.resolve({ id: group.id, userId: admin.id }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects removing a member from a settled trip", async () => {
    const { group, admin, member } = await makeGroup("SETTLED");
    mockSignedInAs(admin.id);

    const res = await removeMember(new Request("http://t"), {
      params: Promise.resolve({ id: group.id, userId: member.id }),
    });
    expect(res.status).toBe(400);
  });

  it("a non-member gets 404", async () => {
    const { group, member } = await makeGroup();
    const outsider = await createTestUser();
    mockSignedInAs(outsider.id);

    const res = await removeMember(new Request("http://t"), {
      params: Promise.resolve({ id: group.id, userId: member.id }),
    });
    expect(res.status).toBe(404);
  });
});

describe("expense removal (integration)", () => {
  beforeEach(resetDb);

  it("the trip creator can remove an expense, cascading its splits", async () => {
    const { group, admin, member } = await makeGroup();
    const expense = await testPrisma.expense.create({
      data: {
        groupId: group.id,
        paidById: admin.id,
        amountCents: 200,
        description: "Lunch",
        splits: {
          create: [
            { userId: admin.id, shareCents: 100 },
            { userId: member.id, shareCents: 100 },
          ],
        },
      },
    });

    mockSignedInAs(admin.id);
    const res = await removeExpense(new Request("http://t"), {
      params: Promise.resolve({ id: group.id, expenseId: expense.id }),
    });
    expect(res.status).toBe(200);

    expect(await testPrisma.expense.findUnique({ where: { id: expense.id } })).toBeNull();
    expect(await testPrisma.expenseSplit.count({ where: { expenseId: expense.id } })).toBe(0);
  });

  it("a non-admin member cannot remove an expense", async () => {
    const { group, admin, member } = await makeGroup();
    const expense = await testPrisma.expense.create({
      data: { groupId: group.id, paidById: admin.id, amountCents: 100, description: "x" },
    });

    mockSignedInAs(member.id);
    const res = await removeExpense(new Request("http://t"), {
      params: Promise.resolve({ id: group.id, expenseId: expense.id }),
    });
    expect(res.status).toBe(403);
    expect(await testPrisma.expense.findUnique({ where: { id: expense.id } })).not.toBeNull();
  });

  it("rejects removing an expense from a settled trip", async () => {
    const { group, admin } = await makeGroup("SETTLED");
    const expense = await testPrisma.expense.create({
      data: { groupId: group.id, paidById: admin.id, amountCents: 100, description: "x" },
    });

    mockSignedInAs(admin.id);
    const res = await removeExpense(new Request("http://t"), {
      params: Promise.resolve({ id: group.id, expenseId: expense.id }),
    });
    expect(res.status).toBe(400);
  });
});
