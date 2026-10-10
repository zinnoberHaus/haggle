import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/account",
        "/saved",
        "/savings",
        "/checkout",
        "/reset-password",
      ],
    },
    sitemap: "https://haggle-blue.vercel.app/sitemap.xml",
  };
}
