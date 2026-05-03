import type { MetadataRoute } from "next";

// The actual sitemap is served by app/sitemap.xml/route.ts which sets an
// explicit Content-Type: application/xml header. This file must exist with
// a default export because Next.js requires it for the reserved filename,
// but the route handler takes precedence for the /sitemap.xml response.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [];
}
