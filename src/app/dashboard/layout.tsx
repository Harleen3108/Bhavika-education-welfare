import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getSessionUser } from "@/server/auth/session";
import { getUserSummary } from "@/server/services/user.service";
import { USER_NAV } from "@/lib/constants";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionUser();
  if (!session) redirect("/login?callbackUrl=/dashboard");

  const summary = (await getUserSummary(session.id)) ?? {
    name: session.name,
    email: session.email,
    avatarUrl: "",
    referralCode: "",
  };

  return (
    <DashboardShell
      nav={USER_NAV}
      user={{ name: summary.name, email: summary.email, avatarUrl: summary.avatarUrl }}
    >
      {children}
    </DashboardShell>
  );
}
