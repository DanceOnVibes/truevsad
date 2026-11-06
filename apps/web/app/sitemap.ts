import type { MetadataRoute } from "next";

const BASE = "https://truevsad.co.uk";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/xray", "/fairfam", "/cabin-bags", "/school-window", "/visit", "/plan-b", "/hotel-problems", "/fairmark", "/fairmark/method", "/how-we-earn", "/sellers", "/sellers/es", "/fees", "/privacy", "/about", "/terms"].map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: "weekly",
  }));
}
