import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@dealscope/analyzer", "@dealscope/scanner", "@dealscope/supabase"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "photos.zillowstatic.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
