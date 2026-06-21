import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow local images in public/images/ without needing explicit dimensions
    // when used with fill prop
    unoptimized: true,
  },
};

export default nextConfig;
