import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { StatBlock } from "@/components/ui/stat-block";
import { Avatar } from "@/components/ui/avatar";
import { NavBar } from "@/components/ui/nav-bar";
import { computeBalanceBreakdown } from "@/lib/settlement";
import { MemberList } from "./member-list";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const CATEGORY_ICON: Record<string, string> = {
  stays: "🏨",
  food: "🍛",
  transport: "🚕",
  activities: "🎟️",
  other: "🧾",
};

export default async function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUserOrThrow();

  const group = await prisma.group.findUnique({
    where: { id },
    include: { members: { include: { user: true } } },
  });

  if (!group || !group.members.some((m) => m.userId === user.id)) {
    notFound();
  }

  const [totals, categoryTotals, expenseCount, recentExpenses, breakdown] = await Promise.all([
    prisma.expense.aggregate({
      where: { groupId: id },
      _sum: { amountCents: true },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      where: { groupId: id },
      _sum: { amountCents: true },
    }),
    prisma.expense.count({ where: { groupId: id } }),
    prisma.expense.findMany({
      where: { groupId: id },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { paidBy: true, splits: true },
    }),
    computeBalanceBreakdown(prisma, id),
  ]);
  const totalCents = totals._sum.amountCents ?? 0;
  const you = breakdown.find((b) => b.userId === user.id);

  return (
    <>
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6 pb-24">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">{group.name}</h1>
            <p className="text-sm text-ink/60">
              {group.members.length} member{group.members.length === 1 ? "" : "s"} ·{" "}
              {group.status === "ACTIVE" ? "Active" : "Settled"}
            </p>
          </div>
          <div className="flex items-center">
            {group.members.map((m) => (
              <div key={m.id} className="-ml-2.5 first:ml-0">
                <Avatar name={m.user.name} seed={m.user.id} size={30} />
              </div>
            ))}
          </div>
        </div>

        <Card className="flex flex-col gap-4">
          <StatBlock label="Total trip spend" value={currency.format(totalCents / 100)} />
          <div className="flex justify-between border-t border-ink/10 pt-3">
            <StatBlock label="Your share" value={currency.format((you?.owedCents ?? 0) / 100)} />
            <StatBlock
              label={you && you.netCents < 0 ? "You owe" : "You're owed"}
              value={currency.format(Math.abs(you?.netCents ?? 0) / 100)}
              className="text-right"
            />
            <StatBlock label="Transactions" value={`${expenseCount}`} className="text-right" />
          </div>
        </Card>

        {categoryTotals.length > 0 && (
          <section className="flex flex-wrap gap-2">
            {categoryTotals.map((c) => (
              <Card key={c.category ?? "uncategorized"} className="min-w-[80px] flex-1 py-3 text-center">
                <div className="text-base">{CATEGORY_ICON[c.category ?? "other"] ?? "🧾"}</div>
                <div className="mt-1 text-[10px] font-bold capitalize text-ink/60">
                  {c.category ?? "other"}
                </div>
                <div className="font-display text-xs font-bold text-ink">
                  {currency.format((c._sum.amountCents ?? 0) / 100)}
                </div>
              </Card>
            ))}
          </section>
        )}

        {recentExpenses.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-medium text-ink/60">Recent activity</h2>
            <ul className="flex flex-col gap-2">
              {recentExpenses.map((e) => (
                <li key={e.id}>
                  <Card className="flex items-center gap-3">
                    <Avatar name={e.paidBy.name} seed={e.paidBy.id} size={32} />
                    <div className="flex-1">
                      <p className="font-display text-sm font-semibold text-ink">{e.description}</p>
                      <p className="text-xs text-ink/50">
                        {e.paidBy.name} paid · split {e.splits.length} way{e.splits.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span className="tabular-nums font-display text-sm font-semibold text-ink">
                      {currency.format(e.amountCents / 100)}
                    </span>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="mb-2 text-sm font-medium text-ink/60">Members</h2>
          <MemberList
            groupId={group.id}
            currentUserId={user.id}
            isAdmin={group.createdById === user.id}
            canRemove={group.status === "ACTIVE"}
            members={group.members.map((m) => ({
              id: m.id,
              userId: m.user.id,
              name: m.user.name,
              joinedAt: m.joinedAt.toISOString(),
            }))}
          />
        </section>

        {group.status === "ACTIVE" && (
          <Card className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- server-generated SVG from our own API route, not an optimizable static asset */}
            <img src={`/api/groups/${group.id}/qr`} alt="Join QR code" width={180} height={180} />
            <p className="font-display text-2xl font-bold tracking-widest text-ink">
              {group.joinCode}
            </p>
            <p className="text-sm text-ink/60">Scan or share this code to invite others</p>
          </Card>
        )}
      </main>
      <NavBar groupId={group.id} />
    </>
  );
}
