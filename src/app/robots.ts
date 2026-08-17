import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";

const base = process.env.NEXT_PUBLIC_SITE_URL || SITE.url;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Never index private / sensitive areas.
      disallow: ["/dashboard", "/admin", "/api", "/login", "/register", "/reset-password"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
