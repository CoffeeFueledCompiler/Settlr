import Link from "next/link";
import { auth, signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-lg text-zinc-600">Settlr</p>
        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <button type="submit" className="rounded bg-zinc-900 px-4 py-2 text-white">
            Sign in with Google
          </button>
        </form>
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
        <h1 className="text-2xl font-semibold">Your trips</h1>
        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <button type="submit" className="text-sm text-zinc-600 underline">
            Sign out
          </button>
        </form>
      </div>

      <Link href="/groups/new" className="w-fit rounded bg-zinc-900 px-4 py-2 text-white">
        New trip
      </Link>

      {groups.length === 0 ? (
        <p className="text-zinc-600">No trips yet — create one, or scan a QR code someone shares with you.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                href={`/groups/${g.id}`}
                className="block rounded border border-zinc-200 px-4 py-3 hover:bg-zinc-50"
              >
                <span className="font-medium">{g.name}</span>
                <span className="ml-2 text-sm text-zinc-500">
                  {g.status === "ACTIVE" ? "Active" : "Settled"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
