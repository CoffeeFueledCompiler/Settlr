import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/session";
import { generateUniqueJoinCode } from "@/lib/join-code";
import { createGroupSchema } from "@/lib/validation/groups";

export async function POST(request: Request) {
  const user = await getSessionUserOrThrow().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createGroupSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const joinCode = await generateUniqueJoinCode();

  const group = await prisma.group.create({
    data: {
      name: parsed.data.name,
      joinCode,
      createdById: user.id,
      members: { create: { userId: user.id } },
    },
  });

  return NextResponse.json(group, { status: 201 });
}

export async function GET() {
  const user = await getSessionUserOrThrow().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const groups = await prisma.group.findMany({
    where: { members: { some: { userId: user.id } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(groups);
}
