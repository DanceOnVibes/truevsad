import type { MetadataRoute } from "next";

const BASE = "https://truevsad.co.uk";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/xray", "/fairfam", "/school-window", "/visit", "/fairmark", "/fairmark/method", "/how-we-earn", "/fees", "/privacy"].map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: "weekly",
  }));
}
