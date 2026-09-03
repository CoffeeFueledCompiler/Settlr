import Link from "next/link";
import { auth, signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button, LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function Home() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
        <h1 className="font-display text-4xl font-bold text-ink">
          Settl<span className="text-slate">r</span>
        </h1>
        <p className="max-w-xs text-center text-ink/70">
          Log what everyone pays on a trip, then settle up in the fewest payments possible.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <Button type="submit">Sign in with Google</Button>
        </form>
        <p className="text-xs text-ink/50">
          By signing in you agree to the{" "}
          <Link href="/terms" className="underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    );
  }

  const groups = await prisma.group.findMany({
    where: { members: { some: { userId: session.user.id } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink">Your trips</h1>
        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <Button type="submit" variant="ghost" className="text-sm">
            Sign out
          </Button>
        </form>
      </div>

      <LinkButton href="/groups/new" className="w-fit">
        New trip
      </LinkButton>

      {groups.length === 0 ? (
        <p className="text-ink/70">
          No trips yet — create one, or scan a QR code someone shares with you.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {groups.map((g) => (
            <li key={g.id}>
              <Link href={`/groups/${g.id}`}>
                <Card className="transition-press active:shadow-pressed flex items-center justify-between">
                  <span className="font-display font-semibold text-ink">{g.name}</span>
                  <span className="text-sm text-ink/60">
                    {g.status === "ACTIVE" ? "Active" : "Settled"}
                  </span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
