import "server-only";
import { dbConnect } from "@/server/db/connect";
import { User } from "@/server/models";
import { verifyPassword } from "@/server/auth/password";
import { AccountStatus, UserRole } from "@/lib/enums";

/**
 * Server-side helpers backing the multi-step admin login UX. These only gate
 * the wizard's step transitions — the authoritative check (password + admin
 * code) still happens inside NextAuth `authorize()` when the session is issued.
 */

/** Step 1 — is this email an admin account in good standing? */
export async function isAdminEmail(email: string): Promise<boolean> {
  await dbConnect();
  const user = await User.findOne({ email: email.toLowerCase() }).select("role status");
  if (!user) return false;
  if (user.role !== UserRole.ADMIN) return false;
  if (
    user.status === AccountStatus.BLOCKED ||
    user.status === AccountStatus.SUSPENDED
  ) {
    return false;
  }
  return true;
}

/** Step 2 — does the password match for this admin? */
export async function verifyAdminPassword(
  email: string,
  password: string,
): Promise<boolean> {
  await dbConnect();
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+passwordHash role status",
  );
  if (!user || user.role !== UserRole.ADMIN) return false;
  if (
    user.status === AccountStatus.BLOCKED ||
    user.status === AccountStatus.SUSPENDED
  ) {
    return false;
  }
  return verifyPassword(password, user.passwordHash);
}
