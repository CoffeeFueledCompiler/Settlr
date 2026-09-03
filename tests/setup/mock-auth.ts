import { vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
}));

import { auth } from "@/auth";

const mockedAuth = auth as unknown as Mock;

export function mockSignedInAs(userId: string) {
  mockedAuth.mockResolvedValue({ user: { id: userId }, expires: "" });
}

export function mockSignedOut() {
  mockedAuth.mockResolvedValue(null);
}
