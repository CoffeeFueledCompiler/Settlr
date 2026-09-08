import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { StatBlock } from "@/components/ui/stat-block";
import { NavBar } from "@/components/ui/nav-bar";
import { computeBalanceBreakdown, computeSettlements } from "@/lib/settlement";
import { BalanceList } from "../balance-list";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default async function BalancesPage({
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

  const [totals, breakdown] = await Promise.all([
    prisma.expense.aggregate({ where: { groupId: id }, _sum: { amountCents: true } }),
    computeBalanceBreakdown(prisma, id),
  ]);
  const totalCents = totals._sum.amountCents ?? 0;
  const fairShareCents = group.members.length > 0 ? Math.round(totalCents / group.members.length) : 0;

  const nameById = new Map(breakdown.map((b) => [b.userId, b.name]));
  const preview =
    group.status === "ACTIVE"
      ? computeSettlements(new Map(breakdown.map((b) => [b.userId, b.netCents])))
      : [];

  return (
    <>
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6 pb-24">
        <h1 className="font-display text-2xl font-bold text-ink">{group.name} — Balances</h1>

        <Card className="flex justify-around text-center">
          <StatBlock label="Total spend" value={currency.format(totalCents / 100)} />
          <StatBlock label="Fair share" value={currency.format(fairShareCents / 100)} />
          <StatBlock label="Members" value={`${group.members.length}`} />
        </Card>

        <section>
          <h2 className="mb-2 text-sm font-medium text-ink/60">Net balance</h2>
          <BalanceList breakdown={breakdown} />
        </section>

        {preview.length > 0 && (
          <section>
            <h2 className="mb-1 text-sm font-medium text-ink/60">Settle-up preview</h2>
            <p className="mb-2 text-xs text-ink/50">
              Live estimate from expenses so far — becomes final once you end the trip.
            </p>
            <ul className="flex flex-col gap-2">
              {preview.map((p, i) => (
                <li key={i}>
                  <Card className="flex items-center justify-between">
                    <span className="font-display text-sm font-semibold text-ink">
                      {nameById.get(p.fromUserId)} → {nameById.get(p.toUserId)}
                    </span>
                    <span className="tabular-nums font-display text-sm font-semibold text-slate">
                      {currency.format(p.amountCents / 100)}
                    </span>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <NavBar groupId={group.id} />
    </>
  );
}
