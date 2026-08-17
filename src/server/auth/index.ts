import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "./config";
import { verifyPassword } from "./password";
import { dbConnect } from "@/server/db/connect";
import { User } from "@/server/models";
import { AccountStatus } from "@/lib/enums";

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

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
        const { email, password } = parsed.data;

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
