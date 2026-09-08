"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import { FilterChip } from "@/components/ui/chips";
import { Avatar } from "@/components/ui/avatar";

type Member = { id: string; name: string };
type Category = "stays" | "food" | "transport" | "activities" | "other";

const CATEGORIES: Category[] = ["stays", "food", "transport", "activities", "other"];
const selectClasses = "shadow-raised rounded-xl border-none bg-base px-2 py-1.5 text-sm text-ink outline-none";

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

function csvField(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function exportExpensesToCsv(expenses: Expense[]) {
  const rows = [
    ["Date", "Description", "Category", "Amount", "Paid by", "Split count"],
    ...expenses.map((e) => [
      new Date(e.createdAt).toISOString(),
      e.description,
      e.category ?? "",
      (e.amountCents / 100).toFixed(2),
      e.paidBy.name,
      String(e.splits.length),
    ]),
  ];
  const csv = rows.map((row) => row.map(csvField).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExpensesClient({
  groupId,
  members,
  currentUserId,
  disabled,
  isAdmin,
}: {
  groupId: string;
  members: Member[];
  currentUserId: string;
  disabled: boolean;
  isAdmin: boolean;
}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<Category | "all">("all");
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function removeExpense(expenseId: string) {
    setRemovingId(expenseId);
    const res = await fetch(`/api/groups/${groupId}/expenses/${expenseId}`, { method: "DELETE" });
    setRemovingId(null);
    if (res.ok) {
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
      setTotal((prev) => prev - 1);
    }
  }

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
      {disabled ? (
        <p className="text-ink/60">This trip has been settled — no more expenses can be added.</p>
      ) : (
        <AddExpenseForm
          groupId={groupId}
          members={members}
          currentUserId={currentUserId}
          onCreated={load}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {(["all", ...CATEGORIES] as const).map((c) => (
            <FilterChip key={c} label={c} active={filter === c} onClick={() => setFilter(c)} />
          ))}
        </div>
        {expenses.length > 0 && (
          <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => exportExpensesToCsv(expenses)}>
            Export CSV
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-ink/60">Loading…</p>
      ) : expenses.length === 0 ? (
        <p className="text-ink/60">No expenses yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {expenses.map((e) => (
            <li key={e.id}>
              <Card className="flex items-center gap-3">
                <Avatar name={e.paidBy.name} seed={e.paidBy.id} size={32} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-semibold text-ink">{e.description}</span>
                    <span className="tabular-nums font-display font-semibold text-ink">
                      {currency.format(e.amountCents / 100)}
                    </span>
                  </div>
                  <p className="text-sm text-ink/60">
                    {e.paidBy.name} paid · split {e.splits.length} way
                    {e.splits.length === 1 ? "" : "s"}
                    {e.category ? ` · ${e.category}` : ""} ·{" "}
                    {new Date(e.createdAt).toLocaleString()}
                  </p>
                </div>
                {!disabled && isAdmin && (
                  <Button
                    variant="ghost"
                    className="px-2 py-1 text-xs text-red-700"
                    disabled={removingId === e.id}
                    onClick={() => removeExpense(e.id)}
                  >
                    {removingId === e.id ? "Removing…" : "Remove"}
                  </Button>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-ink/50">
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
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex gap-2">
          <TextInput
            className="flex-1"
            placeholder="What was it for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={120}
            required
          />
          <TextInput
            className="w-28"
            placeholder="Amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            className={selectClasses}
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
            className={selectClasses}
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
            className={!customMode ? "font-semibold text-slate" : "text-ink/50"}
          >
            Split equally
          </button>
          <span className="text-ink/30">·</span>
          <button
            type="button"
            onClick={() => setCustomMode(true)}
            className={customMode ? "font-semibold text-slate" : "text-ink/50"}
          >
            Custom amounts
          </button>
        </div>

        {!customMode ? (
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <label key={m.id} className="flex items-center gap-1 text-sm text-ink">
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
          <div className="flex flex-col gap-2">
            {members.map((m) => (
              <label key={m.id} className="flex items-center justify-between gap-2 text-sm text-ink">
                {m.name}
                <TextInput
                  className="w-24"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={customShares[m.id] ?? ""}
                  onChange={(e) =>
                    setCustomShares((prev) => ({ ...prev, [m.id]: e.target.value }))
                  }
                />
              </label>
            ))}
            <p className="text-xs text-ink/60">
              {currency.format(customTotal / 100)} of{" "}
              {amountCents ? currency.format(amountCents / 100) : "—"}
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-700">{error}</p>}

        <Button type="submit" disabled={submitting} className="w-fit">
          {submitting ? "Adding…" : "Add expense"}
        </Button>
      </form>
    </Card>
  );
}
