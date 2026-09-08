import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { NavBar } from "@/components/ui/nav-bar";
import { computeAllPairwiseLedgers } from "@/lib/settlement";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default async function OffsetsPage({
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

  const ledgers = await computeAllPairwiseLedgers(prisma, id, user.id);

  return (
    <>
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6 pb-24">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Contribution offset</h1>
          <p className="mt-1 text-sm text-ink/60">
            When two of you pay for each other, Settlr cancels out the overlap — so you only ever
            see what&apos;s actually left owing, not every raw transaction.
          </p>
        </div>

        {ledgers.length === 0 ? (
          <Card>
            <p className="text-ink/70">No other members in this trip yet.</p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {ledgers.map((l) => (
              <li key={l.userId}>
                <Card>
                  <div className="mb-3 flex items-center gap-3">
                    <Avatar name={l.name} seed={l.userId} size={32} />
                    <span className="flex-1 font-display font-semibold text-ink">
                      You and {l.name}
                    </span>
                    {l.netCents === 0 ? (
                      <span className="rounded-xl bg-slate/15 px-3 py-1 text-xs font-bold text-slate">
                        Settled
                      </span>
                    ) : (
                      <span className="rounded-xl bg-ink/10 px-3 py-1 text-xs font-bold text-ink">
                        {l.netCents < 0
                          ? `Owes you ${currency.format(Math.abs(l.netCents) / 100)}`
                          : `You owe ${currency.format(l.netCents / 100)}`}
                      </span>
                    )}
                  </div>

                  {l.lineItems.map((item, i) => (
                    <div
                      key={`${item.expenseId}-${item.direction}-${i}`}
                      className="flex items-center gap-2 py-1 text-xs font-semibold text-ink/65"
                    >
                      <span className="w-3 shrink-0 text-center font-display text-ink/40">
                        {item.direction === "bOwesA" ? "+" : "–"}
                      </span>
                      <span className="flex-1">
                        {item.direction === "bOwesA"
                          ? `${l.name}'s share of ${item.description} (you paid)`
                          : `Your share of ${item.description} (${l.name} paid)`}
                      </span>
                      <span className="tabular-nums font-display font-bold text-ink">
                        {currency.format(item.amountCents / 100)}
                      </span>
                    </div>
                  ))}

                  <div className="mt-2 flex items-center justify-between border-t border-ink/10 pt-2 text-xs font-semibold text-ink/70">
                    <span>
                      Net:{" "}
                      {l.netCents === 0
                        ? "nothing owed either way"
                        : l.netCents < 0
                          ? `${l.name} owes you`
                          : `You owe ${l.name}`}
                    </span>
                    <span className="tabular-nums font-display text-sm font-bold text-slate">
                      {currency.format(Math.abs(l.netCents) / 100)}
                    </span>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>
      <NavBar groupId={group.id} />
    </>
  );
}
