import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/session";

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
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{group.name}</h1>
          <p className="text-zinc-600">{currency.format(totalCents / 100)} total</p>
        </div>
        <Link href={`/groups/${group.id}/expenses`} className="text-sm text-zinc-600 underline">
          View expenses
        </Link>
      </div>

      {categoryTotals.length > 0 && (
        <section className="flex flex-wrap gap-2">
          {categoryTotals.map((c) => (
            <span
              key={c.category ?? "uncategorized"}
              className="rounded-full bg-zinc-100 px-3 py-1 text-sm capitalize"
            >
              {c.category ?? "other"}: {currency.format((c._sum.amountCents ?? 0) / 100)}
            </span>
          ))}
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-600">Members</h2>
        <ul className="flex flex-wrap gap-2">
          {group.members.map((m) => (
            <li key={m.id} className="rounded-full bg-zinc-100 px-3 py-1 text-sm">
              {m.user.name}
            </li>
          ))}
        </ul>
      </section>

      {group.status === "ACTIVE" && (
        <section className="flex flex-col items-center gap-3 rounded border border-zinc-200 p-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- server-generated SVG from our own API route, not an optimizable static asset */}
          <img src={`/api/groups/${group.id}/qr`} alt="Join QR code" width={180} height={180} />
          <p className="text-2xl font-semibold tracking-widest">{group.joinCode}</p>
          <p className="text-sm text-zinc-600">Scan or share this code to invite others</p>
        </section>
      )}
    </main>
  );
}
