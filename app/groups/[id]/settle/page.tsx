import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/session";
import { NavBar } from "@/components/ui/nav-bar";
import { computeBalanceBreakdown, computeSettlements } from "@/lib/settlement";
import { SettleClient } from "./settle-client";

export default async function SettlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUserOrThrow();

  const group = await prisma.group.findUnique({
    where: { id },
    include: { members: true },
  });
  if (!group || !group.members.some((m) => m.userId === user.id)) {
    notFound();
  }

  const [expenseCount, settlements] = await Promise.all([
    prisma.expense.count({ where: { groupId: id } }),
    prisma.settlement.findMany({
      where: { groupId: id },
      include: { fromUser: true, toUser: true },
    }),
  ]);

  // Live preview only — nothing is written until "End trip" is pressed.
  const breakdown = await computeBalanceBreakdown(prisma, id);
  const preview =
    group.status === "ACTIVE"
      ? computeSettlements(new Map(breakdown.map((b) => [b.userId, b.netCents])))
      : [];
  const nameById = new Map(breakdown.map((b) => [b.userId, b.name]));

  return (
    <>
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6 pb-24">
        <h1 className="font-display text-2xl font-bold text-ink">{group.name} — Settle up</h1>
        <SettleClient
          groupId={group.id}
          currentUserId={user.id}
          isAdmin={group.createdById === user.id}
          initialStatus={group.status}
          expenseCount={expenseCount}
          breakdown={breakdown}
          preview={preview.map((p) => ({
            fromUserId: p.fromUserId,
            toUserId: p.toUserId,
            amountCents: p.amountCents,
            fromName: nameById.get(p.fromUserId) ?? "",
            toName: nameById.get(p.toUserId) ?? "",
          }))}
          initialSettlements={settlements.map((s) => ({
            id: s.id,
            fromUserId: s.fromUserId,
            toUserId: s.toUserId,
            amountCents: s.amountCents,
            status: s.status,
            fromUser: { name: s.fromUser.name },
            toUser: { name: s.toUser.name },
          }))}
        />
      </main>
      <NavBar groupId={group.id} />
    </>
  );
}
