import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FloatingContact } from "@/components/layout/FloatingContact";
import { OrganizationJsonLd } from "@/components/seo/JsonLd";
import { ScrollProgress } from "@/components/motion";

/*
  Deliberately NOT async and deliberately reads no cookies. A session read here
  opts every marketing page out of static rendering, which is what made the
  whole public site render on demand. The navbar resolves the account state in
  the browser instead — see SessionNavActions.
*/
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Sits above the sticky navbar so reading position stays visible on the
          long marketing pages. Renders as an empty 3px strip without JS. */}
      <ScrollProgress />
      <OrganizationJsonLd />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <FloatingContact />
    </>
  );
}
