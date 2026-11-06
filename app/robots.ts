import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/paths";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/home", "/menu", "/wishes", "/gifts", "/saved", "/occasions", "/notifications", "/settings", "/search"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
