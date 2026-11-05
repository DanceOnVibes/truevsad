import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    // The API is not for search engines. Shared receipts (/r/) stay crawlable on purpose: each
    // carries a "noindex" tag, which search engines only see if they're allowed to fetch the page.
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: "https://truevsad.co.uk/sitemap.xml",
  };
}
