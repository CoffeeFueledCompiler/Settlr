import type { Prisma, PrismaClient } from "@/app/generated/prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * netCents[user] = sum(Expense.amountCents paid by user) - sum(ExpenseSplit.shareCents owed by user).
 * Two fixed-cost groupBy queries (not per-member), merged in memory.
 */
export async function computeNetBalances(db: Db, groupId: string) {
  const [paidTotals, owedTotals, members] = await Promise.all([
    db.expense.groupBy({
      by: ["paidById"],
      where: { groupId },
      _sum: { amountCents: true },
    }),
    db.expenseSplit.groupBy({
      by: ["userId"],
      where: { expense: { groupId } },
      _sum: { shareCents: true },
    }),
    db.groupMember.findMany({ where: { groupId }, select: { userId: true } }),
  ]);

  const net = new Map<string, number>();
  for (const m of members) net.set(m.userId, 0);
  for (const p of paidTotals) {
    net.set(p.paidById, (net.get(p.paidById) ?? 0) + (p._sum.amountCents ?? 0));
  }
  for (const o of owedTotals) {
    net.set(o.userId, (net.get(o.userId) ?? 0) - (o._sum.shareCents ?? 0));
  }
  return net;
}

/** Per-member paid/owed/net, for the balance-sheet view — read-only, no writes. */
export async function computeBalanceBreakdown(db: Db, groupId: string) {
  const [paidTotals, owedTotals, members] = await Promise.all([
    db.expense.groupBy({
      by: ["paidById"],
      where: { groupId },
      _sum: { amountCents: true },
    }),
    db.expenseSplit.groupBy({
      by: ["userId"],
      where: { expense: { groupId } },
      _sum: { shareCents: true },
    }),
    db.groupMember.findMany({ where: { groupId }, include: { user: true } }),
  ]);

  const paidMap = new Map(paidTotals.map((p) => [p.paidById, p._sum.amountCents ?? 0]));
  const owedMap = new Map(owedTotals.map((o) => [o.userId, o._sum.shareCents ?? 0]));

  return members.map((m) => {
    const paidCents = paidMap.get(m.userId) ?? 0;
    const owedCents = owedMap.get(m.userId) ?? 0;
    return { userId: m.userId, name: m.user.name, paidCents, owedCents, netCents: paidCents - owedCents };
  });
}

export type PairwiseLineItem = {
  expenseId: string;
  description: string;
  amountCents: number;
  direction: "bOwesA" | "aOwesB";
};

/**
 * Direct two-person offset — separate from the group-wide netting algorithm above.
 * Only nets userA and userB's own transactions against each other, nothing routed
 * through a third party. Read-only, safe on an ACTIVE group.
 */
export async function computePairwiseLedger(db: Db, groupId: string, userAId: string, userBId: string) {
  const [bOwesASplits, aOwesBSplits] = await Promise.all([
    db.expenseSplit.findMany({
      where: { userId: userBId, expense: { groupId, paidById: userAId } },
      include: { expense: true },
    }),
    db.expenseSplit.findMany({
      where: { userId: userAId, expense: { groupId, paidById: userBId } },
      include: { expense: true },
    }),
  ]);

  const bOwesA = bOwesASplits.reduce((acc, s) => acc + s.shareCents, 0);
  const aOwesB = aOwesBSplits.reduce((acc, s) => acc + s.shareCents, 0);

  const lineItems: PairwiseLineItem[] = [
    ...bOwesASplits.map((s) => ({
      expenseId: s.expenseId,
      description: s.expense.description,
      amountCents: s.shareCents,
      direction: "bOwesA" as const,
    })),
    ...aOwesBSplits.map((s) => ({
      expenseId: s.expenseId,
      description: s.expense.description,
      amountCents: s.shareCents,
      direction: "aOwesB" as const,
    })),
  ];

  // netCents > 0 => userA owes userB; netCents < 0 => userB owes userA
  return { aOwesB, bOwesA, netCents: aOwesB - bOwesA, lineItems };
}

/** userId's pairwise ledger against every other member of the group. */
export async function computeAllPairwiseLedgers(db: Db, groupId: string, userId: string) {
  const others = await db.groupMember.findMany({
    where: { groupId, userId: { not: userId } },
    include: { user: true },
  });

  return Promise.all(
    others.map(async (m) => ({
      userId: m.userId,
      name: m.user.name,
      ...(await computePairwiseLedger(db, groupId, userId, m.userId)),
    }))
  );
}

/**
 * Greedy debt-simplification: repeatedly match the largest creditor with the
 * largest debtor. Not guaranteed globally minimal (NP-hard in general) but
 * standard, simple to verify, and fine at trip-group scale (2-15 people).
 */
export function computeSettlements(net: Map<string, number>) {
  const creditors: { userId: string; amount: number }[] = [];
  const debtors: { userId: string; amount: number }[] = [];
  for (const [userId, amount] of net) {
    if (amount > 0) creditors.push({ userId, amount });
    else if (amount < 0) debtors.push({ userId, amount: -amount });
  }

  const settlements: { fromUserId: string; toUserId: string; amountCents: number }[] = [];
  while (creditors.length > 0 && debtors.length > 0) {
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);
    const creditor = creditors[0];
    const debtor = debtors[0];
    const amount = Math.min(creditor.amount, debtor.amount);

    settlements.push({ fromUserId: debtor.userId, toUserId: creditor.userId, amountCents: amount });
    creditor.amount -= amount;
    debtor.amount -= amount;
    if (creditor.amount === 0) creditors.shift();
    if (debtor.amount === 0) debtors.shift();
  }

  const totalSettled = settlements.reduce((acc, s) => acc + s.amountCents, 0);
  const totalPositive = Array.from(net.values())
    .filter((v) => v > 0)
    .reduce((acc, v) => acc + v, 0);
  if (totalSettled !== totalPositive) {
    throw new Error(`settlement invariant violated: ${totalSettled} !== ${totalPositive}`);
  }

  return settlements;
}
