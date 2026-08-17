import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { OrganizationJsonLd } from "@/components/seo/JsonLd";
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
      <OrganizationJsonLd />
      <Navbar session={session} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
