import { auth } from "@/auth";

/**
 * Throws if there's no signed-in user. Route handlers typically do:
 *   const user = await getSessionUserOrThrow().catch(() => null);
 *   if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 */
export async function getSessionUserOrThrow() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return { ...session.user, id: session.user.id };
}
