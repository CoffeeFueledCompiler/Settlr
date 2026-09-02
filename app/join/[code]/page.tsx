import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/session";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const user = await getSessionUserOrThrow();
  const joinCode = code.trim().toUpperCase();

  const group = await prisma.group.findUnique({
    where: { joinCode },
    include: { members: { where: { userId: user.id } } },
  });

  if (!group) {
    return (
      <main className="mx-auto max-w-md p-6">
        <p>No trip found with code {code}.</p>
      </main>
    );
  }

  if (group.members.length > 0) {
    redirect(`/groups/${group.id}`);
  }

  if (group.status === "SETTLED") {
    return (
      <main className="mx-auto max-w-md p-6">
        <p>This trip has already been settled.</p>
      </main>
    );
  }

  const groupId = group.id;
  const userId = user.id;

  async function confirmJoin() {
    "use server";
    await prisma.groupMember.create({ data: { groupId, userId } });
    redirect(`/groups/${groupId}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">{group.name}</h1>
      <p className="text-zinc-600">Join this trip?</p>
      <form action={confirmJoin}>
        <button type="submit" className="rounded bg-zinc-900 px-4 py-2 text-white">
          Join trip
        </button>
      </form>
    </main>
  );
}
