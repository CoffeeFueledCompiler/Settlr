import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/session";
import { createExpenseSchema, CATEGORIES } from "@/lib/validation/expenses";

async function getGroupForMember(groupId: string, userId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: true },
  });
  if (!group || !group.members.some((m) => m.userId === userId)) return null;
  return group;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUserOrThrow().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: groupId } = await params;
  const group = await getGroupForMember(groupId, user.id);
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (group.status === "SETTLED") {
    return NextResponse.json(
      { error: "This trip has already been settled" },
      { status: 400 }
    );
  }

  const parsed = createExpenseSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { description, amountCents, category, paidById, splits } = parsed.data;

  const splitSum = splits.reduce((acc, s) => acc + s.shareCents, 0);
  if (splitSum !== amountCents) {
    return NextResponse.json(
      { error: "Splits must add up to the total amount" },
      { status: 400 }
    );
  }

  const memberIds = new Set(group.members.map((m) => m.userId));
  const involvedIds = [paidById, ...splits.map((s) => s.userId)];
  if (involvedIds.some((uid) => !memberIds.has(uid))) {
    return NextResponse.json(
      { error: "Payer and all split members must belong to this trip" },
      { status: 400 }
    );
  }

  const expense = await prisma.expense.create({
    data: {
      groupId,
      paidById,
      amountCents,
      description,
      category,
      splits: { create: splits },
    },
    include: { paidBy: true, splits: { include: { user: true } } },
  });

  return NextResponse.json(expense, { status: 201 });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUserOrThrow().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: groupId } = await params;
  const group = await getGroupForMember(groupId, user.id);
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const categoryParam = searchParams.get("category");
  const category =
    categoryParam && (CATEGORIES as readonly string[]).includes(categoryParam)
      ? categoryParam
      : undefined;
  const skip = Math.max(0, Number(searchParams.get("skip")) || 0);
  const take = Math.min(50, Math.max(1, Number(searchParams.get("take")) || 20));

  const where = { groupId, ...(category ? { category } : {}) };

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { paidBy: true, splits: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.expense.count({ where }),
  ]);

  return NextResponse.json({ expenses, total });
}
