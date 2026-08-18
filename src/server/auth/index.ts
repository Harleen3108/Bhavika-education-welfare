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
import {
  getLockState,
  recordAdminAttempt,
} from "@/server/services/admin-security.service";

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
      async authorize(raw, request) {
        const parsed = credsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password, adminCode } = parsed.data;

        await dbConnect();
        const user = await User.findOne({ email: email.toLowerCase() }).select(
          "+passwordHash name email role status",
        );
        if (!user) return null;

        /*
          Brute-force protection belongs HERE, not only on the multi-step login
          routes. Those routes gate the wizard's UX; this is the only place a
          session is actually issued, so an attacker who posts straight to the
          credentials endpoint bypasses them entirely. Guarding both means the
          wizard gives an honest message and the back door is still shut.

          Scoped to admin accounts: members are covered by the per-IP limiter on
          /api/auth/register and friends, and locking a child out of a quiz
          because someone else mistyped their address is its own denial of
          service.
        */
        const isAdmin = user.role === UserRole.ADMIN;
        const req = request as Request | undefined;

        if (isAdmin) {
          const lock = await getLockState(user.email);
          if (lock.locked) throw new Error("ADMIN_LOCKED");
        }

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) {
          if (isAdmin && req) {
            await recordAdminAttempt({
              req,
              email: user.email,
              stage: "SESSION",
              success: false,
              reason: "Wrong password at the session endpoint",
            });
          }
          return null;
        }

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
        if (isAdmin) {
          if (!adminCode || !safeEqual(adminCode, env.ADMIN_ACCESS_CODE)) {
            if (req) {
              await recordAdminAttempt({
                req,
                email: user.email,
                stage: "CODE",
                success: false,
                reason: adminCode ? "Wrong admin access code" : "No admin access code supplied",
              });
            }
            throw new Error("ADMIN_CODE_INVALID");
          }
          // Only now is the sign-in complete, so only now is it safe to clear
          // the counter — recording success any earlier would let an attacker
          // reset the ladder with a known password and a guessed code.
          if (req) {
            await recordAdminAttempt({
              req,
              email: user.email,
              stage: "SESSION",
              success: true,
            });
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
