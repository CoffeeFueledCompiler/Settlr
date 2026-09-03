"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type Member = { id: string; userId: string; name: string; joinedAt: string };

const dateFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function MemberList({
  groupId,
  members,
  isAdmin,
  currentUserId,
  canRemove,
}: {
  groupId: string;
  members: Member[];
  isAdmin: boolean;
  currentUserId: string;
  canRemove: boolean;
}) {
  const router = useRouter();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(userId: string) {
    setRemovingId(userId);
    setError(null);
    const res = await fetch(`/api/groups/${groupId}/members/${userId}`, { method: "DELETE" });
    setRemovingId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Something went wrong");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-700">{error}</p>}
      <ul className="flex flex-col gap-2">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3">
            <Avatar name={m.name} seed={m.userId} size={32} />
            <div className="flex-1">
              <p className="text-sm font-medium text-ink">{m.name}</p>
              <p className="text-xs text-ink/50">
                Joined {dateFormat.format(new Date(m.joinedAt))}
              </p>
            </div>
            {isAdmin && canRemove && m.userId !== currentUserId && (
              <Button
                variant="ghost"
                className="px-2 py-1 text-xs text-red-700"
                disabled={removingId === m.userId}
                onClick={() => remove(m.userId)}
              >
                {removingId === m.userId ? "Removing…" : "Remove"}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
