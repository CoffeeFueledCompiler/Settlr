"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function NewGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Something went wrong");
      setSubmitting(false);
      return;
    }

    const group = await res.json();
    router.push(`/groups/${group.id}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">New trip</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-zinc-600">Trip name</span>
          <input
            className="rounded border border-zinc-300 px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            required
            autoFocus
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create trip"}
        </button>
      </form>
    </main>
  );
}
