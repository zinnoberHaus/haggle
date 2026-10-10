import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/guides", "/pricing", "/extension", "/privacy", "/terms"].map(
    (path) => ({ url: `https://haggle-blue.vercel.app${path}` }),
  );
}
