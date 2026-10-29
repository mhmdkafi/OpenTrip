import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Reuse recently visited dynamic pages for 30s instead of refetching on every visit.
  experimental: { staleTimes: { dynamic: 30 } },
  // The OCR library starts its own worker script from node_modules, so it must not be bundled.
  serverExternalPackages: ["tesseract.js"],
};

export default nextConfig;
