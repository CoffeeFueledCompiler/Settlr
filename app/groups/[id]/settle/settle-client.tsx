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

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function SettleClient({
  groupId,
  currentUserId,
  initialStatus,
  expenseCount,
  initialSettlements,
}: {
  groupId: string;
  currentUserId: string;
  initialStatus: "ACTIVE" | "SETTLED";
  expenseCount: number;
  initialSettlements: SettlementRow[];
}) {
  const [status, setStatus] = useState(initialStatus);
  const [settlements, setSettlements] = useState(initialSettlements);
  const [ending, setEnding] = useState(false);
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
      <Card className="flex flex-col gap-4">
        <StatBlock
          label="Raw transactions"
          value={`${expenseCount} expense${expenseCount === 1 ? "" : "s"}`}
        />
        {error && <p className="text-sm text-red-700">{error}</p>}
        <Button onClick={endTrip} disabled={ending} className="w-fit">
          {ending ? "Settling…" : "End trip"}
        </Button>
      </Card>
    );
  }

  if (settlements.length === 0) {
    return (
      <Card>
        <p className="text-ink/70">Everyone&apos;s settled — nothing owed either way.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex justify-around">
        <StatBlock label="Raw transactions" value={`${expenseCount}`} />
        <StatBlock label="Final payments" value={`${settlements.length}`} />
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
    </div>
  );
}
