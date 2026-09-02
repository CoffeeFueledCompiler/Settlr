import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUserOrThrow().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      members: { include: { user: true } },
    },
  });

  if (!group || !group.members.some((m) => m.userId === user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [totals, categoryTotals] = await Promise.all([
    prisma.expense.aggregate({
      where: { groupId: id },
      _sum: { amountCents: true },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      where: { groupId: id },
      _sum: { amountCents: true },
    }),
  ]);

  return NextResponse.json({
    ...group,
    totalCents: totals._sum.amountCents ?? 0,
    categoryTotals: categoryTotals.map((c) => ({
      category: c.category,
      totalCents: c._sum.amountCents ?? 0,
    })),
  });
}
