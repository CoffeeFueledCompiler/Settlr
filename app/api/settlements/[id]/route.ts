import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/session";

const patchSettlementSchema = z.object({
  status: z.literal("PAID"),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUserOrThrow().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSettlementSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { id } = await params;
  const settlement = await prisma.settlement.findUnique({
    where: { id },
    include: { group: true },
  });

  const isParty =
    settlement && (settlement.fromUserId === user.id || settlement.toUserId === user.id);
  if (!settlement || !isParty || settlement.group.status !== "SETTLED") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.settlement.update({
    where: { id },
    data: { status: "PAID" },
  });

  return NextResponse.json(updated);
}
