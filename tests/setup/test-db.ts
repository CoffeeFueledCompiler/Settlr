import { prisma } from "@/lib/prisma";

// Re-export the shared singleton: vitest.setup.ts already points DATABASE_URL
// at TEST_DATABASE_URL before this (or any route handler) is imported.
export const testPrisma = prisma;

/** Wipes all rows, FK-safe (children before parents). Call between tests that touch the DB. */
export async function resetDb() {
  await testPrisma.settlement.deleteMany();
  await testPrisma.expenseSplit.deleteMany();
  await testPrisma.expense.deleteMany();
  await testPrisma.groupMember.deleteMany();
  await testPrisma.group.deleteMany();
  await testPrisma.user.deleteMany();
}

export async function createTestUser(overrides: Partial<{ googleId: string; email: string; name: string }> = {}) {
  const suffix = Math.random().toString(36).slice(2, 10);
  return testPrisma.user.create({
    data: {
      googleId: overrides.googleId ?? `test-google-${suffix}`,
      email: overrides.email ?? `test-${suffix}@example.com`,
      name: overrides.name ?? `Test User ${suffix}`,
    },
  });
}
