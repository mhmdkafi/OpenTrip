import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Reuse recently visited dynamic pages for 30s instead of refetching on every visit.
  experimental: { staleTimes: { dynamic: 30 } },
};

export default nextConfig;
