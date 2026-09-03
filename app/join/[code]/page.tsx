import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
        <Card>
          <p className="text-ink">No trip found with code {code}.</p>
        </Card>
      </main>
    );
  }

  if (group.members.length > 0) {
    redirect(`/groups/${group.id}`);
  }

  if (group.status === "SETTLED") {
    return (
      <main className="mx-auto max-w-md p-6">
        <Card>
          <p className="text-ink">This trip has already been settled.</p>
        </Card>
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
      <h1 className="font-display text-2xl font-bold text-ink">{group.name}</h1>
      <Card className="flex flex-col gap-4">
        <p className="text-ink/70">Join this trip?</p>
        <form action={confirmJoin}>
          <Button type="submit">Join trip</Button>
        </form>
      </Card>
    </main>
  );
}
