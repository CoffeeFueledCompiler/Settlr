import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, testPrisma, createTestUser } from "../setup/test-db";
import { mockSignedInAs, mockSignedOut } from "../setup/mock-auth";
import { POST as createGroup, GET as listGroups } from "@/app/api/groups/route";
import { POST as joinGroup } from "@/app/api/groups/join/route";
import { GET as getGroup } from "@/app/api/groups/[id]/route";

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("groups API (integration)", () => {
  beforeEach(resetDb);

  it("POST /api/groups creates a group, a join code, and the creator as first member", async () => {
    const user = await createTestUser();
    mockSignedInAs(user.id);

    const res = await createGroup(jsonRequest("http://t/api/groups", "POST", { name: "Bali" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.joinCode).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);

    const membership = await testPrisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: body.id, userId: user.id } },
    });
    expect(membership).not.toBeNull();
  });

  it("POST /api/groups without a session returns 401 and touches no data", async () => {
    mockSignedOut();
    const before = await testPrisma.group.count();

    const res = await createGroup(jsonRequest("http://t/api/groups", "POST", { name: "x" }));
    expect(res.status).toBe(401);

    expect(await testPrisma.group.count()).toBe(before);
  });

  it("GET /api/groups only lists the caller's own groups", async () => {
    const [alice, bob] = await Promise.all([createTestUser(), createTestUser()]);
    const group = await testPrisma.group.create({
      data: {
        name: "Alice's trip",
        joinCode: "ALICE1",
        createdById: alice.id,
        members: { create: { userId: alice.id } },
      },
    });

    mockSignedInAs(bob.id);
    const res = await listGroups();
    const body = await res.json();
    expect(body.find((g: { id: string }) => g.id === group.id)).toBeUndefined();

    mockSignedInAs(alice.id);
    const res2 = await listGroups();
    const body2 = await res2.json();
    expect(body2.find((g: { id: string }) => g.id === group.id)).toBeDefined();
  });

  it("a non-member gets 404 (not 403) from GET /api/groups/[id]", async () => {
    const [owner, outsider] = await Promise.all([createTestUser(), createTestUser()]);
    const group = await testPrisma.group.create({
      data: {
        name: "Private trip",
        joinCode: "PRIV01",
        createdById: owner.id,
        members: { create: { userId: owner.id } },
      },
    });

    mockSignedInAs(outsider.id);
    const res = await getGroup(new Request(`http://t/api/groups/${group.id}`), {
      params: Promise.resolve({ id: group.id }),
    });
    expect(res.status).toBe(404);
  });

  it("joining via a typed code adds the caller as a member", async () => {
    const [owner, joiner] = await Promise.all([createTestUser(), createTestUser()]);
    const group = await testPrisma.group.create({
      data: {
        name: "Trip",
        joinCode: "JOINME",
        createdById: owner.id,
        members: { create: { userId: owner.id } },
      },
    });

    mockSignedInAs(joiner.id);
    const res = await joinGroup(jsonRequest("http://t/api/groups/join", "POST", { code: "joinme" }));
    expect(res.status).toBe(201);

    const membership = await testPrisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: joiner.id } },
    });
    expect(membership).not.toBeNull();
  });

  it("re-visiting a join code you're already a member of is a no-op, not a duplicate or error", async () => {
    const user = await createTestUser();
    const group = await testPrisma.group.create({
      data: {
        name: "Trip",
        joinCode: "AGAIN1",
        createdById: user.id,
        members: { create: { userId: user.id } },
      },
    });

    mockSignedInAs(user.id);
    const res = await joinGroup(jsonRequest("http://t/api/groups/join", "POST", { code: "AGAIN1" }));
    expect(res.status).toBe(200);

    const memberships = await testPrisma.groupMember.findMany({ where: { groupId: group.id } });
    expect(memberships).toHaveLength(1);
  });

  it("joining a settled group is rejected with a clear error", async () => {
    const [owner, joiner] = await Promise.all([createTestUser(), createTestUser()]);
    await testPrisma.group.create({
      data: {
        name: "Done trip",
        joinCode: "DONE01",
        createdById: owner.id,
        status: "SETTLED",
        settledAt: new Date(),
        members: { create: { userId: owner.id } },
      },
    });

    mockSignedInAs(joiner.id);
    const res = await joinGroup(jsonRequest("http://t/api/groups/join", "POST", { code: "DONE01" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/settled/i);
  });

  it("joining a nonexistent code returns 404", async () => {
    const user = await createTestUser();
    mockSignedInAs(user.id);
    const res = await joinGroup(jsonRequest("http://t/api/groups/join", "POST", { code: "NOPE00" }));
    expect(res.status).toBe(404);
  });
});
