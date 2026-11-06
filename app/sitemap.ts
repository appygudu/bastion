import type { MetadataRoute } from "next";
import { appOrigin } from "@/lib/public-env";

const paths = ["", "/threats", "/exposure", "/pricing", "/docs", "/docs/api", "/docs/security", "/demo", "/enterprise", "/changelog", "/pitch", "/about", "/status", "/security", "/privacy", "/terms", "/acceptable-use", "/login", "/signup"];

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = appOrigin();
  return paths.map((path) => ({ url: `${origin}${path || "/"}`, changeFrequency: "weekly", priority: path === "" ? 1 : 0.6 }));
}
