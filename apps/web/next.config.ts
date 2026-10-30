import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The engine ships as TypeScript source inside the mono-repo.
  transpilePackages: ["@truevsad/true-cost"],
  poweredByHeader: false,
};

export default nextConfig;
