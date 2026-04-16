import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Static export for Capacitor — outputs to /out folder
  output: 'export',
  // Required for static export: images can't use Next.js optimization
  images: { unoptimized: true },
  // Trailing slash ensures correct asset paths inside Capacitor WebView
  trailingSlash: true,
};

export default nextConfig;
