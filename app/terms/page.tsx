import Link from "next/link";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Terms of Service — Settlr" };

export default function TermsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Terms of Service</h1>
        <p className="text-sm text-ink/60">Last updated: September 3, 2026</p>
      </div>

      <Card className="flex flex-col gap-4 text-ink/80">
        <p>
          These terms are a template for a personal/demo project, not vetted legal advice.
          Replace this page with real terms reviewed by a lawyer before using Settlr with
          real users or real money.
        </p>

        <section>
          <h2 className="font-display font-semibold text-ink">1. What Settlr is</h2>
          <p>
            Settlr lets a group record shared expenses during a trip and calculates the
            smallest set of payments needed to settle up at the end. Settlr does not move,
            hold, or process money itself — it only tracks amounts that members have agreed
            to. Any actual payment happens outside the app, between members.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink">2. Accounts</h2>
          <p>
            You sign in with your Google account. You&apos;re responsible for the accuracy of
            the expenses you log and for keeping your Google account secure.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink">3. Group data is shared with your group</h2>
          <p>
            Anything you add to a trip — expenses, amounts, who paid, who owes — is visible
            to every member of that trip. Don&apos;t log anything you wouldn&apos;t want the
            whole group to see.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink">4. No warranty on settlement math</h2>
          <p>
            The settlement calculation is provided as-is. Double-check the final numbers
            before paying anyone based on them.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink">5. Changes</h2>
          <p>These terms may change. Continuing to use Settlr after a change means you accept it.</p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink">6. Contact</h2>
          <p>Questions about these terms: replace this with a real contact address.</p>
        </section>
      </Card>

      <Link href="/" className="text-sm text-ink/60 underline">
        Back to Settlr
      </Link>
    </main>
  );
}
