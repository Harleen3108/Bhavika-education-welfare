import type { MetadataRoute } from "next";
import { PUBLIC_NAV, FOOTER_NAV, SITE } from "@/lib/constants";

const base = process.env.NEXT_PUBLIC_SITE_URL || SITE.url;

/** Legal pages — indexed, but ranked below the content pages. */
const LEGAL = [{ href: "/privacy" }, { href: "/terms" }] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date("2026-08-18");

  const entry = (
    href: string,
    priority: number,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  ) => ({
    url: `${base}${href === "/" ? "" : href}`,
    lastModified: now,
    changeFrequency,
    priority,
  });

  return [
    // Primary nav — the homepage plus the pages we actively want ranked.
    ...PUBLIC_NAV.map((i) =>
      i.href === "/" ? entry(i.href, 1, "weekly") : entry(i.href, 0.8, "weekly"),
    ),
    // Secondary pages: still indexed, just not in the header.
    ...FOOTER_NAV.map((i) => entry(i.href, 0.6, "monthly")),
    ...LEGAL.map((i) => entry(i.href, 0.3, "yearly")),
  ];
}
