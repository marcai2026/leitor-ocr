import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: {
    buildActivity: false,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
