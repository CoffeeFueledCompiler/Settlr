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
          This policy describes what Settlr (&quot;the app&quot;, &quot;we&quot;) collects, why,
          and how you can control it. It&apos;s written to be specific and accurate for the
          app as it actually works today; replace the contact address below with a real one,
          and have it reviewed by a lawyer before relying on it for a production app with real
          users.
        </p>

        <section>
          <h2 className="font-display font-semibold text-ink">1. Who this applies to</h2>
          <p>
            Anyone who creates an account and uses Settlr, a group trip expense tracker that
            lets members log shared expenses and calculates the smallest set of payments
            needed to settle up at the end of a trip.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink">2. Information we collect</h2>
          <p className="font-medium text-ink">From Google Sign-In</p>
          <p>
            Settlr uses &quot;Sign in with Google&quot; (Google OAuth) as its only sign-in
            method — there is no separate username/password. When you sign in, Google shares
            the following with us, limited to the standard <code>openid</code>,{" "}
            <code>email</code>, and <code>profile</code> scopes:
          </p>
          <ul className="list-disc pl-6">
            <li>Your name</li>
            <li>Your email address</li>
            <li>Your Google account profile photo</li>
            <li>A stable Google account identifier, used internally to recognize you on future sign-ins</li>
          </ul>
          <p>
            We do not request or receive access to your Gmail, Google Drive, Google Contacts,
            or any other Google service or data beyond the basic profile fields listed above.
          </p>
          <p className="font-medium text-ink">From using the app</p>
          <ul className="list-disc pl-6">
            <li>Trips (&quot;groups&quot;) you create or join, and their join codes</li>
            <li>Expenses you log: description, amount, category, who paid, and how it was split</li>
            <li>The settlement records generated when a trip ends (who owes whom, how much, and whether it&apos;s been marked paid)</li>
          </ul>
          <p>
            We do not collect payment card numbers, bank details, or process any actual money
            transfer — Settlr only records amounts that members report to each other.
          </p>
          <p className="font-medium text-ink">Automatically collected</p>
          <p>
            A session cookie (see §6) to keep you signed in. We do not use analytics,
            advertising, or cross-site tracking cookies.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink">3. How we use this information</h2>
          <ul className="list-disc pl-6">
            <li>To create and maintain your account, and recognize you on future sign-ins</li>
            <li>To display your name, email, and photo to other members of trips you share, so people know who they&apos;re splitting expenses with</li>
            <li>To let you create, join, and view trips, and to log and view expenses within them</li>
            <li>To calculate net balances and the minimal settlement (who pays whom) when a trip ends</li>
            <li>To keep the service secure and prevent abuse (e.g. verifying you&apos;re a member of a trip before showing its data)</li>
          </ul>
          <p>
            We do not use your data for advertising, do not sell it, and do not use it to
            train machine learning models.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink">4. Who can see your information</h2>
          <ul className="list-disc pl-6">
            <li>
              <strong>Other members of a trip</strong> can see your name, profile photo, and
              any expenses or settlement records associated with that trip. They cannot see
              trips you haven&apos;t joined, or your email address, and members of other
              trips.
            </li>
            <li>
              <strong>Service providers who process data on our behalf</strong>, strictly to
              run the app: our hosting provider (Vercel) and our database provider (Supabase,
              running PostgreSQL). Google acts as our sign-in provider under its own privacy
              policy for the sign-in step itself.
            </li>
          </ul>
          <p>
            We do not share your information with any other third party, and we do not sell
            or rent your information to anyone.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink">5. Data security</h2>
          <p>
            Data in transit is encrypted (HTTPS). Your session is authenticated using a
            signed, HTTP-only cookie. Access to a trip&apos;s data is restricted to that
            trip&apos;s members at the application level on every request.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink">6. Cookies</h2>
          <p>
            We set exactly one cookie category: a session cookie used solely to keep you
            signed in after you authenticate with Google. It contains a signed token, not
            your password or Google credentials. It expires automatically and is cleared when
            you sign out. We do not use third-party advertising or analytics cookies.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink">7. Data retention and deletion</h2>
          <p>
            We retain your account and trip data for as long as your account is active. To
            request deletion of your account and all associated personal data (profile info,
            trips you created, and your membership in others), email us at the address below.
            We&apos;ll delete your account data within 30 days of a verified request, except
            where a shared trip&apos;s expense/settlement history must be retained in
            anonymized form to keep other members&apos; settlement math correct. You can also
            revoke Settlr&apos;s access to your Google account at any time from your{" "}
            <a
              href="https://myaccount.google.com/permissions"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Account permissions page
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink">8. Your rights</h2>
          <p>
            Depending on where you live, you may have the right to access, correct, export,
            or delete your personal data, and to object to or restrict certain processing. To
            exercise any of these, contact us at the address below.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink">9. Children&apos;s privacy</h2>
          <p>
            Settlr is not directed at children under 13, and we do not knowingly collect
            personal information from them. If you believe a child has provided us
            information, contact us and we&apos;ll delete it.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink">10. Changes to this policy</h2>
          <p>
            If this policy changes materially, we&apos;ll update the &quot;Last updated&quot;
            date above and, where appropriate, notify signed-in users in-app.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink">11. Contact</h2>
          <p>
            Questions about this policy or your data: replace this with a real, monitored
            contact email address before publishing.
          </p>
        </section>
      </Card>

      <Link href="/" className="text-sm text-ink/60 underline">
        Back to Settlr
      </Link>
    </main>
  );
}
