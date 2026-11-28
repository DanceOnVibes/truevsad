import type { NextConfig } from "next";

/**
 * Content-Security-Policy: the browser may only load scripts, styles, fonts and data from
 * truevsad.co.uk itself (plus OpenStreetMap's map frame on Visit, and Cloudflare's cookie-free visit counter), and the site can't be framed. Everything we use is same-origin (fonts
 * are self-hosted by next/font). Inline scripts stay allowed because Next.js needs them; a
 * per-request nonce would make every page dynamic and slower. Dev mode also needs eval.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https://cloudflareinsights.com",
  // Visit before you book shows OpenStreetMap's own map in a frame.
  "frame-src https://www.openstreetmap.org",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const MAIN_HOST = "truevsad.co.uk";
const CARS_HOST = "cars.truevsad.co.uk";

const nextConfig: NextConfig = {
  // The engine ships as TypeScript source inside the mono-repo.
  transpilePackages: ["@truevsad/true-cost"],
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Shared receipts are for the people they're sent to: never indexed, even if linked from the board.
      { source: "/r/:slug*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
  // Cars lives at cars.truevsad.co.uk, served by this same app from app/cars. The main site's
  // old /tickets link (already shared in a local group) moves there for good.
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", has: [{ type: "host", value: CARS_HOST }], destination: "/cars" },
        { source: "/tickets", has: [{ type: "host", value: CARS_HOST }], destination: "/cars/tickets" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async redirects() {
    return [
      { source: "/tickets", has: [{ type: "host", value: MAIN_HOST }], destination: `https://${CARS_HOST}/tickets`, permanent: true },
      { source: "/cars", has: [{ type: "host", value: MAIN_HOST }], destination: `https://${CARS_HOST}/`, permanent: true },
      { source: "/cars/:path*", has: [{ type: "host", value: MAIN_HOST }], destination: `https://${CARS_HOST}/:path*`, permanent: true },
    ];
  },
};

export default nextConfig;
