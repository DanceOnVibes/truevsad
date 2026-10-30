import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    // Shared receipts and the API are not for search engines.
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/r/"] }],
    sitemap: "https://truevsad.co.uk/sitemap.xml",
  };
}
