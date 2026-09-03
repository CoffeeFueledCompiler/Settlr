import { describe, it, expect, vi, afterEach } from "vitest";
import { testPrisma } from "../setup/test-db";
import { mockSignedOut } from "../setup/mock-auth";
import { POST as createGroup } from "@/app/api/groups/route";
import { GET as getGroup } from "@/app/api/groups/[id]/route";
import { POST as createExpense } from "@/app/api/groups/[id]/expenses/route";
import { POST as endTrip } from "@/app/api/groups/[id]/end-trip/route";

describe("auth guard (integration)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects unauthenticated requests with 401 before any query runs", async () => {
    mockSignedOut();
    const groupSpy = vi.spyOn(testPrisma.group, "findUnique");
    const groupFindManySpy = vi.spyOn(testPrisma.group, "findMany");
    const expenseSpy = vi.spyOn(testPrisma.expense, "create");

    const res1 = await createGroup(
      new Request("http://t/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "x" }),
      })
    );
    expect(res1.status).toBe(401);

    const res2 = await getGroup(new Request("http://t/api/groups/anything"), {
      params: Promise.resolve({ id: "anything" }),
    });
    expect(res2.status).toBe(401);

    const res3 = await createExpense(
      new Request("http://t/api/groups/anything/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "anything" }) }
    );
    expect(res3.status).toBe(401);

    const res4 = await endTrip(new Request("http://t/api/groups/anything/end-trip", { method: "POST" }), {
      params: Promise.resolve({ id: "anything" }),
    });
    expect(res4.status).toBe(401);

    expect(groupSpy).not.toHaveBeenCalled();
    expect(groupFindManySpy).not.toHaveBeenCalled();
    expect(expenseSpy).not.toHaveBeenCalled();
  });
});
