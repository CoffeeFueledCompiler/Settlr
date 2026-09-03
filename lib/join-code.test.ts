import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resetDb, testPrisma } from "../tests/setup/test-db";
import { generateUniqueJoinCode } from "./join-code";

describe("generateUniqueJoinCode (integration)", () => {
  beforeEach(resetDb);
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retries on a collision and returns a different, unique code", async () => {
    const user = await testPrisma.user.create({
      data: { googleId: "g1", email: "a@example.com", name: "A" },
    });
    await testPrisma.group.create({
      data: { name: "Existing", joinCode: "AAAAAA", createdById: user.id },
    });

    // ALPHABET[0] === "A" — the first 6 Math.random() calls (one per
    // character) reproduce "AAAAAA", forcing a real collision on attempt 1.
    const randomSpy = vi.spyOn(Math, "random");
    for (let i = 0; i < 6; i++) randomSpy.mockReturnValueOnce(0);
    randomSpy.mockReturnValue(0.05); // ALPHABET[1] === "B" for every subsequent call

    const code = await generateUniqueJoinCode();

    expect(code).not.toBe("AAAAAA");
    expect(code).toBe("BBBBBB");

    const stored = await testPrisma.group.findUnique({ where: { joinCode: code } });
    expect(stored).toBeNull(); // generation doesn't persist anything itself
  });

  it("produces a 6-character code from the unambiguous alphabet", async () => {
    const code = await generateUniqueJoinCode();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  });
});
