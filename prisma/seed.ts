import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { splitEqually } from "../lib/split";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const [aisha, raj, mia, leo] = await Promise.all([
    prisma.user.upsert({
      where: { googleId: "seed-google-aisha" },
      update: {},
      create: {
        googleId: "seed-google-aisha",
        email: "aisha@example.com",
        name: "Aisha",
      },
    }),
    prisma.user.upsert({
      where: { googleId: "seed-google-raj" },
      update: {},
      create: {
        googleId: "seed-google-raj",
        email: "raj@example.com",
        name: "Raj",
      },
    }),
    prisma.user.upsert({
      where: { googleId: "seed-google-mia" },
      update: {},
      create: {
        googleId: "seed-google-mia",
        email: "mia@example.com",
        name: "Mia",
      },
    }),
    prisma.user.upsert({
      where: { googleId: "seed-google-leo" },
      update: {},
      create: {
        googleId: "seed-google-leo",
        email: "leo@example.com",
        name: "Leo",
      },
    }),
  ]);

  // ACTIVE group: all four members, ~10 expenses with mixed even/uneven splits.
  const bali = await prisma.group.upsert({
    where: { joinCode: "BAL1TR" },
    update: {},
    create: {
      name: "Bali Trip",
      joinCode: "BAL1TR",
      createdById: aisha.id,
      status: "ACTIVE",
      members: {
        create: [aisha, raj, mia, leo].map((u) => ({ userId: u.id })),
      },
    },
  });

  const baliMemberIds = [aisha.id, raj.id, mia.id, leo.id];
  const baliExpenses: {
    paidById: string;
    amountCents: number;
    description: string;
    category: string;
    splitAmong: string[];
  }[] = [
    { paidById: aisha.id, amountCents: 48000, description: "Villa (4 nights)", category: "stays", splitAmong: baliMemberIds },
    { paidById: raj.id, amountCents: 12050, description: "Group dinner", category: "food", splitAmong: baliMemberIds },
    { paidById: mia.id, amountCents: 6000, description: "Taxi to Uluwatu", category: "transport", splitAmong: [mia.id, leo.id] },
    { paidById: leo.id, amountCents: 9999, description: "Surf lesson", category: "activities", splitAmong: [leo.id, aisha.id, raj.id] },
    { paidById: aisha.id, amountCents: 3200, description: "Breakfast", category: "food", splitAmong: baliMemberIds },
    { paidById: raj.id, amountCents: 15000, description: "Scooter rental (3 days)", category: "transport", splitAmong: [raj.id, mia.id] },
    { paidById: mia.id, amountCents: 22500, description: "Snorkeling trip", category: "activities", splitAmong: baliMemberIds },
    { paidById: leo.id, amountCents: 5075, description: "Beach bar tab", category: "food", splitAmong: [leo.id, mia.id, aisha.id] },
    { paidById: aisha.id, amountCents: 10000, description: "Laundry + misc", category: "other", splitAmong: baliMemberIds },
    { paidById: raj.id, amountCents: 30001, description: "Farewell dinner", category: "food", splitAmong: baliMemberIds },
  ];

  await prisma.$transaction(
    baliExpenses.map((e) =>
      prisma.expense.create({
        data: {
          groupId: bali.id,
          paidById: e.paidById,
          amountCents: e.amountCents,
          description: e.description,
          category: e.category,
          splits: { create: splitEqually(e.amountCents, e.splitAmong) },
        },
      })
    )
  );

  // SETTLED group: three members, already netted down to its final Settlement rows.
  const goa = await prisma.group.upsert({
    where: { joinCode: "GOA2024" },
    update: {},
    create: {
      name: "Goa Trip",
      joinCode: "GOA2024",
      createdById: raj.id,
      status: "SETTLED",
      settledAt: new Date(),
      members: {
        create: [raj, mia, leo].map((u) => ({ userId: u.id })),
      },
    },
  });

  await prisma.expense.create({
    data: {
      groupId: goa.id,
      paidById: raj.id,
      amountCents: 15000,
      description: "Beach shack lunch",
      category: "food",
      splits: { create: splitEqually(15000, [raj.id, mia.id, leo.id]) },
    },
  });

  await prisma.settlement.create({
    data: {
      groupId: goa.id,
      fromUserId: mia.id,
      toUserId: raj.id,
      amountCents: 5000,
      status: "PAID",
    },
  });
  await prisma.settlement.create({
    data: {
      groupId: goa.id,
      fromUserId: leo.id,
      toUserId: raj.id,
      amountCents: 5000,
      status: "PENDING",
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
