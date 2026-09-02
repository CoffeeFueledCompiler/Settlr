"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";

type Member = { id: string; name: string };
type Category = "stays" | "food" | "transport" | "activities" | "other";

const CATEGORIES: Category[] = ["stays", "food", "transport", "activities", "other"];

type Expense = {
  id: string;
  description: string;
  amountCents: number;
  category: string | null;
  createdAt: string;
  paidBy: { id: string; name: string };
  splits: { userId: string; shareCents: number }[];
};

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function ExpensesClient({
  groupId,
  members,
  currentUserId,
  disabled,
}: {
  groupId: string;
  members: Member[];
  currentUserId: string;
  disabled: boolean;
}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<Category | "all">("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = filter === "all" ? "" : `?category=${filter}`;
    const res = await fetch(`/api/groups/${groupId}/expenses${qs}`);
    const data = await res.json();
    setExpenses(data.expenses);
    setTotal(data.total);
    setLoading(false);
  }, [groupId, filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount/filter-change; `load` is a stable useCallback, no render loop
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      {!disabled && (
        <AddExpenseForm
          groupId={groupId}
          members={members}
          currentUserId={currentUserId}
          onCreated={load}
        />
      )}

      <div className="flex flex-wrap gap-2">
        {(["all", ...CATEGORIES] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            className={`rounded-full border px-3 py-1 text-sm capitalize ${
              filter === c
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 text-zinc-700"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-zinc-500">Loading…</p>
      ) : expenses.length === 0 ? (
        <p className="text-zinc-500">No expenses yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {expenses.map((e) => (
            <li key={e.id} className="rounded border border-zinc-200 p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{e.description}</span>
                <span className="tabular-nums">{currency.format(e.amountCents / 100)}</span>
              </div>
              <p className="text-sm text-zinc-500">
                {e.paidBy.name} paid · split {e.splits.length} way{e.splits.length === 1 ? "" : "s"}
                {e.category ? ` · ${e.category}` : ""} ·{" "}
                {new Date(e.createdAt).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-zinc-400">
        {total} expense{total === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function AddExpenseForm({
  groupId,
  members,
  currentUserId,
  onCreated,
}: {
  groupId: string;
  members: Member[];
  currentUserId: string;
  onCreated: () => void;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [paidById, setPaidById] = useState(currentUserId);
  const [splitWith, setSplitWith] = useState<Set<string>>(
    new Set(members.map((m) => m.id))
  );
  const [customMode, setCustomMode] = useState(false);
  const [customShares, setCustomShares] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const amountCents = Math.round(parseFloat(amount || "0") * 100);

  function toggleMember(id: string) {
    setSplitWith((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!amountCents || amountCents <= 0) {
      setError("Enter a valid amount");
      return;
    }

    let splits: { userId: string; shareCents: number }[];
    if (customMode) {
      splits = Object.entries(customShares)
        .filter(([, v]) => v.trim() !== "")
        .map(([userId, v]) => ({ userId, shareCents: Math.round(parseFloat(v) * 100) }));
      const sum = splits.reduce((acc, s) => acc + s.shareCents, 0);
      if (sum !== amountCents) {
        setError(
          `Splits total ${currency.format(sum / 100)}, but the expense is ${currency.format(
            amountCents / 100
          )}`
        );
        return;
      }
    } else {
      const ids = Array.from(splitWith);
      if (ids.length === 0) {
        setError("Select at least one person to split with");
        return;
      }
      const base = Math.floor(amountCents / ids.length);
      const remainder = amountCents - base * ids.length;
      splits = ids.map((userId, i) => ({
        userId,
        shareCents: base + (i < remainder ? 1 : 0),
      }));
    }

    setSubmitting(true);
    const res = await fetch(`/api/groups/${groupId}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description,
        amountCents,
        category: category || undefined,
        paidById,
        splits,
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Something went wrong");
      return;
    }

    setDescription("");
    setAmount("");
    setCategory("");
    setCustomShares({});
    onCreated();
  }

  const customTotal = Object.values(customShares).reduce(
    (acc, v) => acc + (parseFloat(v) || 0) * 100,
    0
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded border border-zinc-200 p-4">
      <div className="flex gap-2">
        <input
          className="flex-1 rounded border border-zinc-300 px-3 py-2"
          placeholder="What was it for?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={120}
          required
        />
        <input
          className="w-28 rounded border border-zinc-300 px-3 py-2"
          placeholder="Amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className="rounded border border-zinc-300 px-2 py-1 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value as Category | "")}
        >
          <option value="">No category</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          className="rounded border border-zinc-300 px-2 py-1 text-sm"
          value={paidById}
          onChange={(e) => setPaidById(e.target.value)}
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} paid
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => setCustomMode(false)}
          className={!customMode ? "font-semibold" : "text-zinc-500"}
        >
          Split equally
        </button>
        <span>·</span>
        <button
          type="button"
          onClick={() => setCustomMode(true)}
          className={customMode ? "font-semibold" : "text-zinc-500"}
        >
          Custom amounts
        </button>
      </div>

      {!customMode ? (
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <label key={m.id} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={splitWith.has(m.id)}
                onChange={() => toggleMember(m.id)}
              />
              {m.name}
            </label>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {members.map((m) => (
            <label key={m.id} className="flex items-center justify-between gap-2 text-sm">
              {m.name}
              <input
                className="w-24 rounded border border-zinc-300 px-2 py-1"
                inputMode="decimal"
                placeholder="0.00"
                value={customShares[m.id] ?? ""}
                onChange={(e) =>
                  setCustomShares((prev) => ({ ...prev, [m.id]: e.target.value }))
                }
              />
            </label>
          ))}
          <p className="text-xs text-zinc-500">
            {currency.format(customTotal / 100)} of{" "}
            {amountCents ? currency.format(amountCents / 100) : "—"}
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-fit rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {submitting ? "Adding…" : "Add expense"}
      </button>
    </form>
  );
}
