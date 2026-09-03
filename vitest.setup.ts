import { afterAll } from "vitest";
import { TEST_DATABASE_URL } from "./tests/setup/embedded-db";

// Route handlers import the shared `lib/prisma` singleton, which reads
// DATABASE_URL at import time. Pointing it at the embedded test Postgres here
// (before any test file imports a route handler) lets integration tests
// exercise the real route handlers against a real database, not mocks.
process.env.DATABASE_URL = TEST_DATABASE_URL;

afterAll(async () => {
  const { prisma } = await import("./lib/prisma");
  await prisma.$disconnect();
});
