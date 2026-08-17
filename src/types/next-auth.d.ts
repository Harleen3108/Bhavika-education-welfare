import type { DefaultSession } from "next-auth";
import type { AccountStatus, UserRole } from "@/lib/enums";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      status: AccountStatus;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole;
    status?: AccountStatus;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: UserRole;
    status?: AccountStatus;
  }
}
