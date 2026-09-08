"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatBlock } from "@/components/ui/stat-block";

type SettlementRow = {
  id: string;
  fromUserId: string;
  toUserId: string;
  amountCents: number;
  status: "PENDING" | "PAID";
  fromUser: { name: string };
  toUser: { name: string };
};

type PreviewRow = { fromUserId: string; toUserId: string; amountCents: number; fromName: string; toName: string };

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function SettleClient({
  groupId,
  currentUserId,
  isAdmin,
  initialStatus,
  expenseCount,
  preview,
  initialSettlements,
}: {
  groupId: string;
  currentUserId: string;
  isAdmin: boolean;
  initialStatus: "ACTIVE" | "SETTLED";
  expenseCount: number;
  preview: PreviewRow[];
  initialSettlements: SettlementRow[];
}) {
  const [status, setStatus] = useState(initialStatus);
  const [settlements, setSettlements] = useState(initialSettlements);
  const [ending, setEnding] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function endTrip() {
    setEnding(true);
    setError(null);
    const res = await fetch(`/api/groups/${groupId}/end-trip`, { method: "POST" });
    setEnding(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Something went wrong");
      return;
    }

    const data = await res.json();
    setSettlements(data.settlements);
    setStatus("SETTLED");
  }

  async function reopenTrip() {
    setReopening(true);
    setError(null);
    const res = await fetch(`/api/groups/${groupId}/reopen`, { method: "POST" });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Something went wrong");
      setReopening(false);
      return;
    }

    // Reopening also throws away the settle-up preview computed for the ACTIVE
    // state, which this component was never handed — reload to fetch it fresh.
    window.location.reload();
  }

  async function markPaid(id: string) {
    const res = await fetch(`/api/settlements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID" }),
    });
    if (res.ok) {
      setSettlements((prev) => prev.map((s) => (s.id === id ? { ...s, status: "PAID" } : s)));
    }
  }

  if (status === "ACTIVE") {
    return (
      <div className="flex flex-col gap-6">
        <Card className="flex justify-around">
          <StatBlock label="Raw transactions" value={`${expenseCount}`} />
        </Card>

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
                      {p.fromName} → {p.toName}
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

        {error && <p className="text-sm text-red-700">{error}</p>}
        <Button onClick={endTrip} disabled={ending} className="w-fit">
          {ending ? "Settling…" : "End trip"}
        </Button>
      </div>
    );
  }

  if (settlements.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <Card>
          <p className="text-ink/70">Everyone&apos;s settled — nothing owed either way.</p>
        </Card>
        {isAdmin && <ReopenButton reopening={reopening} onClick={reopenTrip} error={error} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex items-center justify-around">
        <div className="text-center">
          <p className="font-display text-2xl font-bold text-ink">{expenseCount}</p>
          <p className="text-[10px] font-bold tracking-wide text-ink/55">RAW IOUs</p>
        </div>
        <span className="text-lg text-slate">→</span>
        <div className="text-center">
          <p className="font-display text-2xl font-bold text-slate">{settlements.length}</p>
          <p className="text-[10px] font-bold tracking-wide text-ink/55">PAYMENTS</p>
        </div>
      </Card>

      {/* Deliberate dark exception — the single boldest surface in the app. Don't reuse this treatment elsewhere. */}
      <ul className="shadow-raised-ink flex flex-col gap-2 rounded-2xl bg-ink p-4">
        {settlements.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2 text-cream"
          >
            <span className="tabular-nums">
              {s.fromUser.name} → {s.toUser.name}, {currency.format(s.amountCents / 100)}
            </span>
            {s.status === "PAID" ? (
              <span className="text-sm text-cream/50">Paid</span>
            ) : s.fromUserId === currentUserId || s.toUserId === currentUserId ? (
              <Button onClick={() => markPaid(s.id)} className="px-3 py-1 text-sm">
                Mark paid
              </Button>
            ) : (
              <span className="text-sm text-cream/50">Pending</span>
            )}
          </li>
        ))}
      </ul>

      {isAdmin && <ReopenButton reopening={reopening} onClick={reopenTrip} error={error} />}
    </div>
  );
}

function ReopenButton({
  reopening,
  onClick,
  error,
}: {
  reopening: boolean;
  onClick: () => void;
  error: string | null;
}) {
  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-700">{error}</p>}
      <Button variant="ghost" onClick={onClick} disabled={reopening} className="w-fit">
        {reopening ? "Reopening…" : "Reopen trip"}
      </Button>
      <p className="text-xs text-ink/50">
        Unlocks the trip for new expenses and clears these settlements — you&apos;ll need to end the trip again once it&apos;s settled.
      </p>
    </div>
  );
}
