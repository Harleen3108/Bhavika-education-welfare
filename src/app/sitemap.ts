import type { MetadataRoute } from "next";
import { PUBLIC_NAV, SITE } from "@/lib/constants";

const base = process.env.NEXT_PUBLIC_SITE_URL || SITE.url;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date("2026-08-12");
  return PUBLIC_NAV.map((item) => ({
    url: `${base}${item.href === "/" ? "" : item.href}`,
    lastModified: now,
    changeFrequency: item.href === "/" ? "weekly" : "monthly",
    priority: item.href === "/" ? 1 : 0.7,
  }));
}
