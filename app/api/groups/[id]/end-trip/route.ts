import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/session";
import { computeNetBalances, computeSettlements } from "@/lib/settlement";

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

  if (group.status === "SETTLED") {
    const settlements = await prisma.settlement.findMany({
      where: { groupId },
      include: { fromUser: true, toUser: true },
    });
    return NextResponse.json({ settlements });
  }

  const settlements = await prisma.$transaction(async (tx) => {
    const net = await computeNetBalances(tx, groupId);
    const computed = computeSettlements(net);

    // Atomically claim the ACTIVE -> SETTLED transition so a concurrent
    // double end-trip call can't create settlements twice.
    const claimed = await tx.group.updateMany({
      where: { id: groupId, status: "ACTIVE" },
      data: { status: "SETTLED", settledAt: new Date() },
    });

    if (claimed.count > 0 && computed.length > 0) {
      await tx.settlement.createMany({
        data: computed.map((s) => ({ ...s, groupId })),
      });
    }

    return tx.settlement.findMany({
      where: { groupId },
      include: { fromUser: true, toUser: true },
    });
  });

  return NextResponse.json({ settlements });
}
