import "server-only";
import { auth } from "./index";
import { AccountStatus, UserRole } from "@/lib/enums";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
};

/** Returns the current session user, or null if unauthenticated. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name ?? "Member",
    email: session.user.email ?? "",
    role: session.user.role ?? UserRole.USER,
    status: session.user.status ?? AccountStatus.PENDING,
  };
}

export class AuthError extends Error {
  constructor(
    public code: "UNAUTHENTICATED" | "FORBIDDEN" | "ACCOUNT_RESTRICTED",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/** Require an authenticated, non-restricted user. Throws AuthError otherwise. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("UNAUTHENTICATED", "You must be logged in.");
  if (user.status === AccountStatus.BLOCKED || user.status === AccountStatus.SUSPENDED) {
    throw new AuthError("ACCOUNT_RESTRICTED", `Your account is ${user.status.toLowerCase()}.`);
  }
  return user;
}

/** Require an admin user. Throws AuthError otherwise. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== UserRole.ADMIN) {
    throw new AuthError("FORBIDDEN", "Admin access required.");
  }
  return user;
}
