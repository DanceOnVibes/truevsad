import type { MetadataRoute } from "next";

const BASE = "https://truevsad.co.uk";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/xray", "/privacy"].map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: "weekly",
  }));
}
