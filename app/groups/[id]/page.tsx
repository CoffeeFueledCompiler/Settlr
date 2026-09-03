import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { StatBlock } from "@/components/ui/stat-block";
import { CategoryChip } from "@/components/ui/chips";
import { NavBar } from "@/components/ui/nav-bar";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

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

  const [totals, categoryTotals] = await Promise.all([
    prisma.expense.aggregate({
      where: { groupId: id },
      _sum: { amountCents: true },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      where: { groupId: id },
      _sum: { amountCents: true },
    }),
  ]);
  const totalCents = totals._sum.amountCents ?? 0;

  return (
    <>
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6 pb-24">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">{group.name}</h1>
            <p className="text-sm text-ink/60">
              {group.status === "ACTIVE" ? "Active" : "Settled"}
            </p>
          </div>
          <LinkButton href={`/groups/${group.id}/expenses`} variant="ghost">
            Add expense
          </LinkButton>
        </div>

        <Card>
          <StatBlock label="Total spend" value={currency.format(totalCents / 100)} />
        </Card>

        {categoryTotals.length > 0 && (
          <section className="flex flex-wrap gap-2">
            {categoryTotals.map((c) => (
              <CategoryChip
                key={c.category ?? "uncategorized"}
                label={c.category ?? "other"}
                value={currency.format((c._sum.amountCents ?? 0) / 100)}
              />
            ))}
          </section>
        )}

        <section>
          <h2 className="mb-2 text-sm font-medium text-ink/60">Members</h2>
          <ul className="flex flex-wrap gap-3">
            {group.members.map((m) => (
              <li key={m.id} className="flex flex-col items-center gap-1">
                <Avatar name={m.user.name} seed={m.user.id} />
                <span className="text-xs text-ink/70">{m.user.name}</span>
              </li>
            ))}
          </ul>
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
