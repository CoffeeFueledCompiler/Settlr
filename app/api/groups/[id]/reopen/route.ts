import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/session";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUserOrThrow().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: groupId } = await params;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: true },
  });
  if (!group || !group.members.some((m) => m.userId === user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (group.createdById !== user.id) {
    return NextResponse.json({ error: "Only the trip creator can reopen a trip" }, { status: 403 });
  }

  if (group.status !== "SETTLED") {
    return NextResponse.json({ error: "This trip isn't settled" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.settlement.deleteMany({ where: { groupId } }),
    prisma.group.update({ where: { id: groupId }, data: { status: "ACTIVE", settledAt: null } }),
  ]);

  return NextResponse.json({ ok: true });
}
