import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/session";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const user = await getSessionUserOrThrow().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: groupId, userId: targetUserId } = await params;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: true },
  });
  if (!group || !group.members.some((m) => m.userId === user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (group.createdById !== user.id) {
    return NextResponse.json(
      { error: "Only the trip creator can remove a member" },
      { status: 403 }
    );
  }

  if (group.status === "SETTLED") {
    return NextResponse.json(
      { error: "This trip has already been settled" },
      { status: 400 }
    );
  }

  if (targetUserId === user.id) {
    return NextResponse.json(
      { error: "The trip creator can't remove themselves" },
      { status: 400 }
    );
  }

  const membership = group.members.find((m) => m.userId === targetUserId);
  if (!membership) {
    return NextResponse.json({ error: "That person isn't a member of this trip" }, { status: 404 });
  }

  await prisma.groupMember.delete({ where: { id: membership.id } });

  return NextResponse.json({ ok: true });
}
