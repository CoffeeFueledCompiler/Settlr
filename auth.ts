import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { GoogleProfile } from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ profile }) {
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
    async jwt({ token, profile }) {
      const googleId = (profile as GoogleProfile | undefined)?.sub;
      if (googleId) {
        const user = await prisma.user.findUnique({ where: { googleId } });
        if (user) token.userId = user.id;
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
