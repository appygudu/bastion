import type { MetadataRoute } from "next";
import { appOrigin } from "@/lib/public-env";

export default function robots(): MetadataRoute.Robots {
  const origin = appOrigin();
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/app", "/api"] },
    sitemap: `${origin}/sitemap.xml`,
  };
}
