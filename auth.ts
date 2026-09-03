import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { GoogleProfile } from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

// Test-only sign-in bypass for Playwright e2e — never enabled outside
// E2E_TESTING=1, so real Google credentials are never needed/used in CI.
// See PROJECT_PLAN.md / testing-agent.md: e2e must use a mock/stub, not real OAuth.
const e2eProvider =
  process.env.E2E_TESTING === "1"
    ? [
        Credentials({
          id: "e2e-test",
          name: "E2E Test Login",
          credentials: { email: { label: "Email", type: "email" } },
          async authorize(credentials) {
            const email = credentials?.email;
            if (typeof email !== "string" || !email) return null;
            const user = await prisma.user.upsert({
              where: { email },
              update: {},
              create: { email, name: email.split("@")[0], googleId: `e2e-${email}` },
            });
            return { id: user.id, email: user.email, name: user.name };
          },
        }),
      ]
    : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google, ...e2eProvider],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ profile, account }) {
      if (account?.provider !== "google") return true; // e2e-test: user already resolved in authorize()

      const google = profile as GoogleProfile | undefined;
      if (!google?.sub || !google.email || !google.name) return false;

      await prisma.user.upsert({
        where: { googleId: google.sub },
        update: { name: google.name, avatarUrl: google.picture },
        create: {
          googleId: google.sub,
          email: google.email,
          name: google.name,
          avatarUrl: google.picture,
        },
      });
      return true;
    },
    async jwt({ token, profile, user, account }) {
      if (account?.provider === "e2e-test" && user?.id) {
        token.userId = user.id;
        return token;
      }
      const googleId = (profile as GoogleProfile | undefined)?.sub;
      if (googleId) {
        const dbUser = await prisma.user.findUnique({ where: { googleId } });
        if (dbUser) token.userId = dbUser.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.userId === "string") {
        session.user.id = token.userId;
      }
      return session;
    },
  },
});
