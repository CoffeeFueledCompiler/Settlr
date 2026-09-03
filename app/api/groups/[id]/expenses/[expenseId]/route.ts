import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/session";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  const user = await getSessionUserOrThrow().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: groupId, expenseId } = await params;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: true },
  });
  if (!group || !group.members.some((m) => m.userId === user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (group.createdById !== user.id) {
    return NextResponse.json(
      { error: "Only the trip creator can remove an expense" },
      { status: 403 }
    );
  }

  if (group.status === "SETTLED") {
    return NextResponse.json(
      { error: "This trip has already been settled" },
      { status: 400 }
    );
  }

  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!expense || expense.groupId !== groupId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.expense.delete({ where: { id: expenseId } });

  return NextResponse.json({ ok: true });
}
