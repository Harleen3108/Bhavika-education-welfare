import { SITE } from "@/lib/constants";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || SITE.url;

/** Organization + NGO structured data for rich search results. */
export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "NGO",
    name: SITE.name,
    alternateName: SITE.shortName,
    url: siteUrl,
    logo: `${siteUrl}/logo-lockup.png`,
    slogan: SITE.tagline,
    description: SITE.description,
    email: SITE.contact.email,
    telephone: SITE.contact.phone,
    address: {
      "@type": "PostalAddress",
      addressCountry: "IN",
      addressLocality: SITE.contact.address,
    },
    sameAs: Object.values(SITE.social).filter(Boolean),
  };
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** Generic breadcrumb JSON-LD for interior pages. */
export function BreadcrumbJsonLd({ items }: { items: { name: string; path: string }[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${siteUrl}${it.path}`,
    })),
  };
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
