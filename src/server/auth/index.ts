import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { timingSafeEqual } from "crypto";
import { authConfig } from "./config";
import { verifyPassword } from "./password";
import { dbConnect } from "@/server/db/connect";
import { User } from "@/server/models";
import { AccountStatus, UserRole } from "@/lib/enums";
import { env } from "@/lib/env";

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  // Only supplied by the multi-step admin login flow.
  adminCode: z.string().optional(),
});

/** Constant-time string comparison to avoid leaking the admin code via timing. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password, adminCode } = parsed.data;

        await dbConnect();
        const user = await User.findOne({ email: email.toLowerCase() }).select(
          "+passwordHash name email role status",
        );
        if (!user) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        // Hard block at the auth boundary — a BLOCKED/SUSPENDED user cannot sign in.
        if (
          user.status === AccountStatus.BLOCKED ||
          user.status === AccountStatus.SUSPENDED
        ) {
          throw new Error(`ACCOUNT_${user.status}`);
        }

        // Admins must additionally present the correct admin access code. This is
        // the real security gate for the multi-step admin login — even if the UI
        // steps are bypassed, no admin session is issued without a valid code.
        if (user.role === UserRole.ADMIN) {
          if (!adminCode || !safeEqual(adminCode, env.ADMIN_ACCESS_CODE)) {
            throw new Error("ADMIN_CODE_INVALID");
          }
        }

        // Update last login (fire and forget).
        User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } }).catch(
          () => {},
        );

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
});
