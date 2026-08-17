import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { OrganizationJsonLd } from "@/components/seo/JsonLd";
import { ScrollProgress } from "@/components/motion";
import { getSessionUser } from "@/server/auth/session";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  const session = user ? { name: user.name, role: user.role } : null;
  return (
    <>
      {/* Sits above the sticky navbar so reading position stays visible on the
          long marketing pages. Renders as an empty 3px strip without JS. */}
      <ScrollProgress />
      <OrganizationJsonLd />
      <Navbar session={session} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
