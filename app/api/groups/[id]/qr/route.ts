import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUserOrThrow().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: user.id } },
  });
  const group = membership
    ? await prisma.group.findUnique({ where: { id } })
    : null;

  if (!group) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL}/join/${group.joinCode}`;
  const svg = await QRCode.toString(joinUrl, { type: "svg" });

  return new NextResponse(svg, {
    headers: { "Content-Type": "image/svg+xml" },
  });
}
