import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/session";
import { joinGroupSchema } from "@/lib/validation/groups";

export async function POST(request: Request) {
  const user = await getSessionUserOrThrow().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = joinGroupSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const joinCode = parsed.data.code.toUpperCase();
  const group = await prisma.group.findUnique({
    where: { joinCode },
    include: { members: { where: { userId: user.id } } },
  });

  if (!group) {
    return NextResponse.json({ error: "No trip found with that code" }, { status: 404 });
  }

  if (group.members.length > 0) {
    return NextResponse.json({ groupId: group.id }, { status: 200 });
  }

  if (group.status === "SETTLED") {
    return NextResponse.json(
      { error: "This trip has already been settled" },
      { status: 400 }
    );
  }

  try {
    await prisma.groupMember.create({ data: { groupId: group.id, userId: user.id } });
  } catch (e) {
    // Concurrent duplicate join (e.g. a double-click) — already a member, not an error.
    const isDuplicate = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
    if (!isDuplicate) throw e;
  }

  return NextResponse.json({ groupId: group.id }, { status: 201 });
}
