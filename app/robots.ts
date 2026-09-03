import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // API routes and every auth-gated trip page — nothing for a crawler to
      // index there, and an unauthenticated request just bounces to sign-in.
      disallow: ["/api/", "/groups/", "/join/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
