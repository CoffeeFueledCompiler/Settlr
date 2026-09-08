import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";

type BalanceRow = { userId: string; name: string; paidCents: number; owedCents: number; netCents: number };

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** Per-member paid/owed/net cards with a progress bar — shared by the balances page and the settle-up preview. */
export function BalanceList({ breakdown }: { breakdown: BalanceRow[] }) {
  const maxPaid = Math.max(1, ...breakdown.map((b) => b.paidCents));

  return (
    <ul className="flex flex-col gap-3">
      {breakdown.map((b) => (
        <li key={b.userId}>
          <Card>
            <div className="flex items-center gap-3">
              <Avatar name={b.name} seed={b.userId} size={32} />
              <span className="flex-1 font-display font-semibold text-ink">{b.name}</span>
              <span
                className={`tabular-nums font-display font-semibold ${
                  b.netCents >= 0 ? "text-slate" : "text-ink/75"
                }`}
              >
                {b.netCents >= 0 ? "+" : "–"}
                {currency.format(Math.abs(b.netCents) / 100)}
              </span>
            </div>
            <p className="mt-1 text-xs text-ink/50">
              Paid {currency.format(b.paidCents / 100)} · owes {currency.format(b.owedCents / 100)}
            </p>
            <div className="shadow-pressed mt-2 h-2 overflow-hidden rounded-full">
              <div
                className={`h-full rounded-full ${b.netCents >= 0 ? "bg-slate" : "bg-ink/35"}`}
                style={{ width: `${Math.min(100, (b.paidCents / maxPaid) * 100)}%` }}
              />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
