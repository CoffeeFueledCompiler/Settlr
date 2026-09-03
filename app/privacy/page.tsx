import Link from "next/link";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Privacy Policy — Settlr" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Privacy Policy</h1>
        <p className="text-sm text-ink/60">Last updated: September 3, 2026</p>
      </div>

      <Card className="flex flex-col gap-4 text-ink/80">
        <p>
          This is a template for a personal/demo project, not vetted legal advice. Replace
          this page with a real privacy policy reviewed by a lawyer before using Settlr with
          real users or real data.
        </p>

        <section>
          <h2 className="font-display font-semibold text-ink">1. What we collect</h2>
          <p>
            When you sign in with Google, we store your name, email address, and profile
            photo. When you use the app, we store the trips you create or join, the
            expenses you log, and the resulting settlement records.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink">2. How it&apos;s used</h2>
          <p>
            Solely to run the app: identifying you, showing your trips, splitting expenses,
            and calculating who owes whom. We don&apos;t sell your data or use it for
            advertising.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink">3. Who can see it</h2>
          <p>
            Members of a trip can see each other&apos;s names, avatars, and that trip&apos;s
            expenses and settlements. We don&apos;t share your data with anyone outside your
            trips, except as needed to run the service (e.g. our database host).
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink">4. Cookies</h2>
          <p>
            We use a session cookie to keep you signed in. We don&apos;t use tracking or
            advertising cookies.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink">5. Data retention and deletion</h2>
          <p>
            We keep your data while your account is active. To request deletion of your
            account and associated data, use the contact address below.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink">6. Changes</h2>
          <p>If this policy changes, we&apos;ll update the date at the top of this page.</p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink">7. Contact</h2>
          <p>Questions about this policy: replace this with a real contact address.</p>
        </section>
      </Card>

      <Link href="/" className="text-sm text-ink/60 underline">
        Back to Settlr
      </Link>
    </main>
  );
}
