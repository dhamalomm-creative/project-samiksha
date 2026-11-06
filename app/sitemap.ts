import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/paths";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return ["", "/discover", "/signup", "/privacy", "/terms"].map((path) => ({ url: `${base}${path}` }));
}
