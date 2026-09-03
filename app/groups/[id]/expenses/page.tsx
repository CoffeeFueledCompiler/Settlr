import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/session";
import { NavBar } from "@/components/ui/nav-bar";
import { ExpensesClient } from "./expenses-client";

export default async function ExpensesPage({
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

  return (
    <>
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6 pb-24">
        <h1 className="font-display text-2xl font-bold text-ink">{group.name}</h1>
        <ExpensesClient
          groupId={group.id}
          members={group.members.map((m) => ({ id: m.user.id, name: m.user.name }))}
          currentUserId={user.id}
          disabled={group.status === "SETTLED"}
        />
      </main>
      <NavBar groupId={group.id} />
    </>
  );
}
