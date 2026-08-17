import type { NextAuthConfig } from "next-auth";
import { AccountStatus, UserRole } from "@/lib/enums";

/**
 * Edge-safe Auth.js config (no DB / Node-only imports here). The Credentials
 * provider with its DB lookup is added in ./index.ts so this object can also be
 * consumed by middleware running on the edge runtime.
 */
export const authConfig = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 }, // 30 days
  pages: {
    signIn: "/login",
    error: "/login",
  },
  trustHost: true,
  callbacks: {
    /** Persist identity + role + status into the JWT at sign-in. */
    async jwt({ token, user }) {
      if (user) {
        token.uid = (user as { id: string }).id;
        token.role = (user as { role?: UserRole }).role ?? UserRole.USER;
        token.status =
          (user as { status?: AccountStatus }).status ?? AccountStatus.PENDING;
      }
      return token;
    },
    /** Expose safe fields to the client session. */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? "";
        session.user.role = (token.role as UserRole) ?? UserRole.USER;
        session.user.status = (token.status as AccountStatus) ?? AccountStatus.PENDING;
      }
      return session;
    },
  },
  providers: [], // real providers attached in ./index.ts
} satisfies NextAuthConfig;
