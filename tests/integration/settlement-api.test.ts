import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, testPrisma, createTestUser } from "../setup/test-db";
import { mockSignedInAs } from "../setup/mock-auth";
import { POST as endTrip } from "@/app/api/groups/[id]/end-trip/route";
import { PATCH as markPaid } from "@/app/api/settlements/[id]/route";

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("settlement API (integration)", () => {
  beforeEach(resetDb);

  it("end-trip nets real expenses into the minimal settlement set and locks the group", async () => {
    const [a, b, c] = await Promise.all([createTestUser(), createTestUser(), createTestUser()]);
    const group = await testPrisma.group.create({
      data: {
        name: "Trip",
        joinCode: "ENDIT1",
        createdById: a.id,
        members: { create: [{ userId: a.id }, { userId: b.id }, { userId: c.id }] },
      },
    });

    // a pays 300, split evenly 3 ways -> a:+200, b:-100, c:-100
    await testPrisma.expense.create({
      data: {
        groupId: group.id,
        paidById: a.id,
        amountCents: 300,
        description: "Dinner",
        splits: {
          create: [
            { userId: a.id, shareCents: 100 },
            { userId: b.id, shareCents: 100 },
            { userId: c.id, shareCents: 100 },
          ],
        },
      },
    });

    mockSignedInAs(a.id);
    const res = await endTrip(new Request(`http://t/api/groups/${group.id}/end-trip`, { method: "POST" }), {
      params: Promise.resolve({ id: group.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.settlements.reduce((acc: number, s: { amountCents: number }) => acc + s.amountCents, 0)).toBe(
      200
    );
    expect(body.settlements.every((s: { toUserId: string }) => s.toUserId === a.id)).toBe(true);

    const updatedGroup = await testPrisma.group.findUniqueOrThrow({ where: { id: group.id } });
    expect(updatedGroup.status).toBe("SETTLED");
    expect(updatedGroup.settledAt).not.toBeNull();
  });

  it("calling end-trip twice is idempotent — no duplicate settlement rows", async () => {
    const [a, b] = await Promise.all([createTestUser(), createTestUser()]);
    const group = await testPrisma.group.create({
      data: {
        name: "Trip",
        joinCode: "ENDIT2",
        createdById: a.id,
        members: { create: [{ userId: a.id }, { userId: b.id }] },
      },
    });
    await testPrisma.expense.create({
      data: {
        groupId: group.id,
        paidById: a.id,
        amountCents: 200,
        description: "Lunch",
        splits: {
          create: [
            { userId: a.id, shareCents: 100 },
            { userId: b.id, shareCents: 100 },
          ],
        },
      },
    });

    mockSignedInAs(a.id);
    const req = () =>
      endTrip(new Request(`http://t/api/groups/${group.id}/end-trip`, { method: "POST" }), {
        params: Promise.resolve({ id: group.id }),
      });

    const first = await (await req()).json();
    const second = await (await req()).json();

    expect(second.settlements).toHaveLength(first.settlements.length);
    expect(await testPrisma.settlement.count({ where: { groupId: group.id } })).toBe(
      first.settlements.length
    );
  });

  it("a member with an exactly-zero balance gets no settlement row", async () => {
    const [a, b, c] = await Promise.all([createTestUser(), createTestUser(), createTestUser()]);
    const group = await testPrisma.group.create({
      data: {
        name: "Trip",
        joinCode: "ZEROBAL",
        createdById: a.id,
        members: { create: [{ userId: a.id }, { userId: b.id }, { userId: c.id }] },
      },
    });
    // c pays for exactly their own share elsewhere — net zero overall for c.
    await testPrisma.expense.create({
      data: {
        groupId: group.id,
        paidById: a.id,
        amountCents: 200,
        description: "A pays B",
        splits: {
          create: [
            { userId: a.id, shareCents: 100 },
            { userId: b.id, shareCents: 100 },
          ],
        },
      },
    });
    await testPrisma.expense.create({
      data: {
        groupId: group.id,
        paidById: c.id,
        amountCents: 50,
        description: "C pays only for self",
        splits: { create: [{ userId: c.id, shareCents: 50 }] },
      },
    });

    mockSignedInAs(a.id);
    const res = await endTrip(new Request(`http://t/api/groups/${group.id}/end-trip`, { method: "POST" }), {
      params: Promise.resolve({ id: group.id }),
    });
    const body = await res.json();

    expect(
      body.settlements.some((s: { fromUserId: string; toUserId: string }) => s.fromUserId === c.id || s.toUserId === c.id)
    ).toBe(false);
  });

  it("PATCH /api/settlements/[id] only lets a party to the settlement mark it paid", async () => {
    const [a, b, outsider] = await Promise.all([createTestUser(), createTestUser(), createTestUser()]);
    const group = await testPrisma.group.create({
      data: {
        name: "Trip",
        joinCode: "MARKPD1",
        createdById: a.id,
        status: "SETTLED",
        settledAt: new Date(),
        members: { create: [{ userId: a.id }, { userId: b.id }] },
      },
    });
    const settlement = await testPrisma.settlement.create({
      data: { groupId: group.id, fromUserId: b.id, toUserId: a.id, amountCents: 500 },
    });

    mockSignedInAs(outsider.id);
    const denied = await markPaid(jsonRequest(`http://t/api/settlements/${settlement.id}`, "PATCH", { status: "PAID" }), {
      params: Promise.resolve({ id: settlement.id }),
    });
    expect(denied.status).toBe(404);

    mockSignedInAs(b.id);
    const allowed = await markPaid(jsonRequest(`http://t/api/settlements/${settlement.id}`, "PATCH", { status: "PAID" }), {
      params: Promise.resolve({ id: settlement.id }),
    });
    expect(allowed.status).toBe(200);

    const updated = await testPrisma.settlement.findUniqueOrThrow({ where: { id: settlement.id } });
    expect(updated.status).toBe("PAID");
  });
});
