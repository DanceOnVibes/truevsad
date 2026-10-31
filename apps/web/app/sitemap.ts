import type { MetadataRoute } from "next";

const BASE = "https://truevsad.co.uk";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/xray", "/school-window", "/visit", "/fairmark", "/fairmark/method", "/how-we-earn", "/privacy"].map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: "weekly",
  }));
}
