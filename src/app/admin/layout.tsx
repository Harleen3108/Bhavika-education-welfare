import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getSessionUser } from "@/server/auth/session";
import { getUserSummary } from "@/server/services/user.service";
import { ADMIN_NAV } from "@/lib/constants";
import { UserRole } from "@/lib/enums";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser();
  if (!session) redirect("/login?callbackUrl=/admin");
  if (session.role !== UserRole.ADMIN) redirect("/dashboard");

  const summary = (await getUserSummary(session.id)) ?? {
    name: session.name,
    email: session.email,
    avatarUrl: "",
    referralCode: "",
  };

  return (
    <DashboardShell
      nav={ADMIN_NAV}
      variant="admin"
      user={{ name: summary.name, email: summary.email, avatarUrl: summary.avatarUrl }}
    >
      {children}
    </DashboardShell>
  );
}
