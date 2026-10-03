import type { NextConfig } from "next";

// GitHub Pages serves the app under /Adventure-App. Per-branch previews are
// built into subfolders (e.g. /Adventure-App/missions-p1) by setting
// PAGES_BASE_PATH (or NEXT_PUBLIC_BASE_PATH) at build time.
const basePath =
  process.env.PAGES_BASE_PATH ?? process.env.NEXT_PUBLIC_BASE_PATH ?? "/Adventure-App";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  images: {
    unoptimized: true,
  },
  // Helps GitHub Pages serve directory URLs like /Adventure-App/
  trailingSlash: true,
};

export default nextConfig;
