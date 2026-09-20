import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/Adventure-App",
  assetPrefix: "/Adventure-App",
  images: {
    unoptimized: true,
  },
  // Helps GitHub Pages serve directory URLs like /Adventure-App/
  trailingSlash: true,
};

export default nextConfig;
